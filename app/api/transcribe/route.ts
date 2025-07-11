import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { AssemblyAI } from 'assemblyai';

export async function POST(req: NextRequest) {
  try {
    const client = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY || '' });
    const { audioPath, audioUrl, filename, isPodcast } = await req.json();
    
    if ((!audioPath && !audioUrl) || !filename) {
      return NextResponse.json({ message: 'Missing audio source or filename' }, { status: 400 });
    }

    let audioSource: string;
    
    if (isPodcast && audioUrl) {
      // For podcasts, use the direct URL
      audioSource = audioUrl;
    } else if (audioPath) {
      // For uploads, use the local file path
      const absAudioPath = path.join(process.cwd(), audioPath.replace(/^\//, ''));
      if (!fs.existsSync(absAudioPath)) {
        return NextResponse.json({ message: 'Audio file not found' }, { status: 404 });
      }
      audioSource = absAudioPath;
    } else {
      return NextResponse.json({ message: 'No valid audio source provided' }, { status: 400 });
    }

    // Transcribe using AssemblyAI SDK (handles upload and polling)
    const transcript = await client.transcripts.transcribe({
      audio: audioSource,
      speaker_labels: true,
      auto_chapters: false,
    });

    if (!transcript || transcript.status !== 'completed') {
      return NextResponse.json({ message: transcript?.error || 'Transcription failed' }, { status: 500 });
    }

    // Save transcript as .txt and .json
    const outputDir = path.join(process.cwd(), 'uploads', 'transcripts');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const base = filename.replace(/\.[^/.]+$/, '');
    const txtPath = path.join(outputDir, `${base}.txt`);
    const jsonPath = path.join(outputDir, `${base}.json`);
    fs.writeFileSync(txtPath, transcript.text || '', 'utf8');
    fs.writeFileSync(jsonPath, JSON.stringify(transcript, null, 2), 'utf8');

    return NextResponse.json({
      filename: `${base}.txt`,
      txtContent: transcript.text || '',
      jsonContent: JSON.stringify(transcript, null, 2),
      txtDownloadUrl: `/uploads/transcripts/${base}.txt`,
      jsonDownloadUrl: `/uploads/transcripts/${base}.json`,
    });
  } catch (err: unknown) {
    return NextResponse.json({ message: err instanceof Error ? err.message : String(err) || 'Failed to transcribe audio' }, { status: 500 });
  }
} 