import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import youtubedl from 'youtube-dl-exec';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ message: 'Missing YouTube URL' }, { status: 400 });
    }

    // Download audio to uploads/audio/
    const outputDir = path.join(process.cwd(), 'uploads', 'audio');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    // Use youtube-dl-exec to get video info first
    const info = await youtubedl(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: [
        'referer:youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
      ],
    });
    let title = 'audio';
    if (typeof info === 'object' && info !== null && 'title' in info && typeof info.title === 'string') {
      title = info.title;
    }
    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const audioPath = path.join(outputDir, `${safeTitle}.mp3`);

    // Download and extract audio
    await youtubedl(url, {
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: 0,
      output: audioPath,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: [
        'referer:youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
      ],
    });

    return NextResponse.json({ audioPath: `/uploads/audio/${safeTitle}.mp3`, title });
  } catch (err: unknown) {
    return NextResponse.json({ message: err instanceof Error ? err.message : String(err) || 'Failed to download video' }, { status: 500 });
  }
} 