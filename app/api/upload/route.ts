import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';

export const runtime = 'nodejs'; // Ensure Node.js runtime for streaming

export async function POST(req: NextRequest) {
  try {
    // Use Next.js built-in formData() to properly handle multipart data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }

    const filename = file.name;
    const ext = path.extname(filename).toLowerCase();
    
    // Validate file type
    if (!ext.match(/\.(mp4|mp3|m4a)$/)) {
      return NextResponse.json({ message: 'Unsupported file type. Please upload MP4, MP3, or M4A files.' }, { status: 400 });
    }

    const outputDir = path.join(process.cwd(), 'uploads', 'audio');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const tempPath = path.join(outputDir, `temp_${Date.now()}${ext}`);

    // Convert File to Buffer and write to disk
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(tempPath, buffer);

    // Verify file was written correctly
    if (!fs.existsSync(tempPath)) {
      return NextResponse.json({ message: 'Failed to save uploaded file' }, { status: 500 });
    }

    const fileStats = fs.statSync(tempPath);
    if (fileStats.size === 0) {
      fs.unlinkSync(tempPath); // Clean up empty file
      return NextResponse.json({ message: 'Uploaded file is empty' }, { status: 400 });
    }

    let audioPath = tempPath;
    let finalName = filename;

    if (ext === '.mp4') {
      // Extract audio as MP3
      finalName = filename.replace(/\.mp4$/, '.mp3');
      audioPath = path.join(outputDir, finalName);
      
      try {
        await new Promise((resolve, reject) => {
          ffmpeg(tempPath)
            .toFormat('mp3')
            .audioQuality(2) // Use quality setting instead of codec
            .on('end', resolve)
            .on('error', (err) => {
              console.error('FFmpeg error:', err);
              reject(err);
            })
            .save(audioPath);
        });
        
        // Clean up temp video file
        fs.unlinkSync(tempPath);
      } catch (ffmpegError) {
        // Try fallback with different approach
        try {
          console.log('Trying fallback audio extraction method...');
          await new Promise((resolve, reject) => {
            ffmpeg(tempPath)
              .format('mp3')
              .audioChannels(2)
              .audioFrequency(44100)
              .on('end', resolve)
              .on('error', (err) => {
                console.error('FFmpeg fallback error:', err);
                reject(err);
              })
              .save(audioPath);
          });
          
          // Clean up temp video file
          fs.unlinkSync(tempPath);
        } catch (fallbackError) {
          // Clean up files on error
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
          if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
          
          const errorMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
          
          // Provide helpful error message
          if (errorMessage.includes('codec') || errorMessage.includes('not available')) {
            return NextResponse.json({ 
              message: `FFmpeg codec issue: ${errorMessage}. Please ensure ffmpeg is installed with MP3 support. Try: brew install ffmpeg` 
            }, { status: 500 });
          }
          
          return NextResponse.json({ 
            message: `Failed to extract audio from video: ${errorMessage}` 
          }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ 
      audioPath: `/uploads/audio/${path.basename(audioPath)}`,
      message: 'File uploaded successfully'
    });
    
  } catch (err: unknown) {
    console.error('Upload error:', err);
    return NextResponse.json({ 
      message: err instanceof Error ? err.message : String(err) || 'Failed to upload file' 
    }, { status: 500 });
  }
} 