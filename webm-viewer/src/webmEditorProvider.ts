import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class WebmEditorProvider
  implements vscode.CustomReadonlyEditorProvider<vscode.CustomDocument>
{
  public static readonly VIEW_TYPE = 'webmViewer.webmPreview';

  constructor(private readonly context: vscode.ExtensionContext) {}

  public openCustomDocument(
    uri: vscode.Uri,
    _openContext: vscode.CustomDocumentOpenContext,
    _token: vscode.CancellationToken
  ): vscode.CustomDocument {
    return {
      uri,
      dispose: () => undefined,
    };
  }

  public async resolveCustomEditor(
    document: vscode.CustomDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'media'),
        // The video file's directory must be whitelisted so asWebviewUri works.
        vscode.Uri.file(path.dirname(document.uri.fsPath)),
      ],
    };

    const videoSrc = webviewPanel.webview.asWebviewUri(document.uri);
    webviewPanel.webview.html = this.buildHtml(
      webviewPanel.webview,
      videoSrc,
      path.basename(document.uri.fsPath)
    );
  }

  private buildHtml(
    webview: vscode.Webview,
    videoSrc: vscode.Uri,
    fileName: string
  ): string {
    const nonce = getNonce();

    const templatePath = path.join(
      this.context.extensionPath,
      'media',
      'player.html'
    );

    let template: string;
    try {
      template = fs.readFileSync(templatePath, 'utf8');
    } catch {
      return `<!DOCTYPE html><html><body style="background:#1e1e1e;color:#ccc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><p>Error: media/player.html not found. Please rebuild the extension.</p></body></html>`;
    }

    return template
      .replace(/\{\{CSP_SOURCE\}\}/g, webview.cspSource)
      .replace(/\{\{NONCE\}\}/g, nonce)
      .replace(/\{\{VIDEO_SRC\}\}/g, videoSrc.toString())
      .replace(/\{\{FILE_NAME\}\}/g, escapeHtml(fileName));
  }
}

function getNonce(): string {
  let text = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
