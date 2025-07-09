import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';

export const runtime = 'nodejs'; // Ensure Node.js runtime for streaming

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.startsWith('multipart/form-data')) {
      return NextResponse.json({ message: 'Content-Type must be multipart/form-data' }, { status: 400 });
    }

    // Parse multipart form data
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      return NextResponse.json({ message: 'Missing boundary in Content-Type' }, { status: 400 });
    }

    // Use a simple parser for multipart (since formidable/multer are not available in edge runtime)
    // For Node.js runtime, you can use formidable or busboy, but here is a minimal approach:
    const buffer = Buffer.from(await req.arrayBuffer());
    const parts = buffer.toString().split(`--${boundary}`);
    const filePart = parts.find(p => p.includes('filename='));
    if (!filePart) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }
    const match = filePart.match(/filename="(.+?)"/);
    if (!match) {
      return NextResponse.json({ message: 'No filename found' }, { status: 400 });
    }
    const filename = match[1];
    const ext = path.extname(filename).toLowerCase();
    const outputDir = path.join(process.cwd(), 'uploads', 'audio');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const tempPath = path.join(outputDir, `temp_${Date.now()}${ext}`);

    // Extract file content
    const fileStart = filePart.indexOf('\r\n\r\n') + 4;
    const fileEnd = filePart.lastIndexOf('\r\n');
    const fileBuffer = Buffer.from(filePart.substring(fileStart, fileEnd), 'binary');
    fs.writeFileSync(tempPath, fileBuffer);

    let audioPath = tempPath;
    let finalName = filename;
    if (ext === '.mp4') {
      // Extract audio as MP3
      finalName = filename.replace(/\.mp4$/, '.mp3');
      audioPath = path.join(outputDir, finalName);
      await new Promise((resolve, reject) => {
        ffmpeg(tempPath)
          .toFormat('mp3')
          .on('end', resolve)
          .on('error', reject)
          .save(audioPath);
      });
      fs.unlinkSync(tempPath); // Remove temp video
    }

    return NextResponse.json({ audioPath: `/uploads/audio/${path.basename(audioPath)}` });
  } catch (err: unknown) {
    return NextResponse.json({ message: err instanceof Error ? err.message : String(err) || 'Failed to upload file' }, { status: 500 });
  }
} 