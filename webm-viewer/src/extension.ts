import * as vscode from 'vscode';
import { WebmEditorProvider } from './webmEditorProvider';

export function activate(context: vscode.ExtensionContext): void {
  const provider = new WebmEditorProvider(context);

  const registration = vscode.window.registerCustomEditorProvider(
    WebmEditorProvider.VIEW_TYPE,
    provider,
    {
      supportsMultipleEditorsPerDocument: false,
      webviewOptions: {
        // Keeps the video paused at its current position when the user tabs
        // away, rather than reloading from scratch on every tab switch.
        retainContextWhenHidden: true,
      },
    }
  );

  context.subscriptions.push(registration);
}

export function deactivate(): void {}
