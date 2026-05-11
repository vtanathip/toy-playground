import { NextRequest, NextResponse } from 'next/server';
import { listVaultFiles, readVaultPath } from '@/lib/drive';

export const runtime = 'nodejs';

export async function GET() {
  const files = await listVaultFiles();
  return NextResponse.json({ files: files.map((f) => f.path.replace(/\\/g, '/')) });
}

export async function POST(req: NextRequest) {
  const { path }: { path: string } = await req.json();
  const content = await readVaultPath(path);
  return NextResponse.json({ content: content ?? '' });
}
