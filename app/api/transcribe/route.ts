import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { AssemblyAI } from 'assemblyai';

export async function POST(req: NextRequest) {
  try {
    const client = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY || '' });
    const { audioPath, filename } = await req.json();
    if (!audioPath || !filename) {
      return NextResponse.json({ message: 'Missing audioPath or filename' }, { status: 400 });
    }

    // Get absolute path to audio file
    const absAudioPath = path.join(process.cwd(), audioPath.replace(/^\//, ''));
    if (!fs.existsSync(absAudioPath)) {
      return NextResponse.json({ message: 'Audio file not found' }, { status: 404 });
    }

    // Transcribe using AssemblyAI SDK (handles upload and polling)
    const transcript = await client.transcripts.transcribe({
      audio: absAudioPath,
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