import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import YTDlpWrap from 'yt-dlp-wrap';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ message: 'Missing YouTube URL' }, { status: 400 });
    }

    const outputDir = path.join(process.cwd(), 'uploads', 'audio');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    // Use the yt-dlp binary from app/bin/yt-dlp
    const ytDlpBinary = path.join(process.cwd(), 'app', 'bin', 'yt-dlp');
    const ytDlpWrap = new YTDlpWrap(ytDlpBinary);
    // Get video info
    const info = await ytDlpWrap.getVideoInfo(url);
    const title = info.title || 'audio';
    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const audioPath = path.join(outputDir, `${safeTitle}.mp3`);

    // Download and extract audio as MP3
    await ytDlpWrap.execPromise([
      url,
      '-x',
      '--audio-format', 'mp3',
      '-o', audioPath,
    ]);

    return NextResponse.json({ audioPath: `/uploads/audio/${safeTitle}.mp3`, title });
  } catch (err: unknown) {
    console.error('YouTube download error:', err);
    return NextResponse.json({ message: err instanceof Error ? err.message : String(err) || 'Failed to download video' }, { status: 500 });
  }
} 