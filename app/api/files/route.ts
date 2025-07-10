import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const url = new URL(req.url!);
  const filePath = url.searchParams.get('path');
  if (!filePath) {
    return NextResponse.json({ message: 'Missing file path' }, { status: 400 });
  }

  // Only allow files within the uploads directory
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const absPath = path.join(process.cwd(), filePath);
  if (!absPath.startsWith(uploadsDir)) {
    return NextResponse.json({ message: 'Invalid file path' }, { status: 403 });
  }

  if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) {
    return NextResponse.json({ message: 'File not found' }, { status: 404 });
  }

  const ext = path.extname(absPath).toLowerCase();
  const contentType = ext === '.json' ? 'application/json' : 'text/plain';
  const fileContent = fs.readFileSync(absPath, 'utf8');
  return new NextResponse(fileContent, {
    status: 200,
    headers: { 'Content-Type': contentType },
  });
} 