'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Download, Upload, Youtube, FileAudio, AlertTriangle } from 'lucide-react';

type ProcessingStep = 'idle' | 'downloading' | 'extracting' | 'transcribing' | 'complete' | 'error';

interface TranscriptResult {
  filename: string;
  txtContent: string;
  jsonContent: string;
  txtDownloadUrl: string;
  jsonDownloadUrl: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('youtube');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState<ProcessingStep>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [result, setResult] = useState<TranscriptResult | null>(null);

  const getStepMessage = (step: ProcessingStep) => {
    switch (step) {
      case 'downloading': return 'Downloading YouTube video...';
      case 'extracting': return 'Extracting audio...';
      case 'transcribing': return 'Transcribing with Assembly AI...';
      case 'complete': return 'Transcription complete!';
      case 'error': return 'An error occurred';
      default: return 'Ready to process';
    }
  };

  const handleYouTubeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) return;

    setProcessing('downloading');
    setProgress(10);
    setError(null);
    setResult(null);

    try {
      // Download YouTube video
      const downloadResponse = await fetch('/api/youtube-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl }),
      });

      if (!downloadResponse.ok) {
        const errorData = await downloadResponse.json();
        throw new Error(errorData.message || 'Failed to download video');
      }

      const { audioPath, title } = await downloadResponse.json();
      
      setProcessing('transcribing');
      setProgress(50);

      // Transcribe audio
      const transcribeResponse = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioPath, filename: title }),
      });

      if (!transcribeResponse.ok) {
        const errorData = await transcribeResponse.json();
        throw new Error(errorData.message || 'Failed to transcribe audio');
      }

      const transcriptData = await transcribeResponse.json();
      setResult(transcriptData);
      setProcessing('complete');
      setProgress(100);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setErrorDetails(err instanceof Error ? err.stack || 'No additional details' : 'Unknown error');
      setProcessing('error');
      setProgress(0);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setProcessing('extracting');
    setProgress(20);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.message || 'Failed to upload file');
      }

      const { audioPath } = await uploadResponse.json();
      
      setProcessing('transcribing');
      setProgress(50);

      // Transcribe audio
      const transcribeResponse = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioPath, filename: selectedFile.name }),
      });

      if (!transcribeResponse.ok) {
        const errorData = await transcribeResponse.json();
        throw new Error(errorData.message || 'Failed to transcribe audio');
      }

      const transcriptData = await transcribeResponse.json();
      setResult(transcriptData);
      setProcessing('complete');
      setProgress(100);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setErrorDetails(err instanceof Error ? err.stack || 'No additional details' : 'Unknown error');
      setProcessing('error');
      setProgress(0);
    }
  };

  const resetApp = () => {
    setProcessing('idle');
    setProgress(0);
    setError(null);
    setErrorDetails(null);
    setResult(null);
    setYoutubeUrl('');
    setSelectedFile(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            YouTube Downloader & Transcription
          </h1>
          <p className="text-gray-600">
            Download YouTube videos or upload audio files for AI transcription with speaker diarization
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileAudio className="h-5 w-5" />
              Audio Processing & Transcription
            </CardTitle>
          </CardHeader>
          <CardContent>
            {processing !== 'idle' && processing !== 'complete' && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{getStepMessage(processing)}</span>
                  <Badge variant="outline">{progress}%</Badge>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            )}

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">{error}</div>
                  <details className="text-xs">
                    <summary className="cursor-pointer">View technical details</summary>
                    <pre className="mt-2 whitespace-pre-wrap bg-gray-100 p-2 rounded text-xs">
                      {errorDetails}
                    </pre>
                  </details>
                </AlertDescription>
              </Alert>
            )}

            {result && (
              <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-800 mb-3">Transcription Complete!</h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">File: {result.filename}</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm">
                      <a href={result.txtDownloadUrl} download>
                        <Download className="h-4 w-4 mr-1" />
                        Download TXT
                      </a>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <a href={result.jsonDownloadUrl} download>
                        <Download className="h-4 w-4 mr-1" />
                        Download JSON
                      </a>
                    </Button>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Preview:</Label>
                    <Textarea
                      value={result.txtContent.substring(0, 500) + (result.txtContent.length > 500 ? '...' : '')}
                      readOnly
                      className="h-32 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="youtube" className="flex items-center gap-2">
                  <Youtube className="h-4 w-4" />
                  YouTube URL
                </TabsTrigger>
                <TabsTrigger value="mp4" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  MP4 Upload
                </TabsTrigger>
                <TabsTrigger value="mp3" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  MP3 Upload
                </TabsTrigger>
              </TabsList>

              <TabsContent value="youtube" className="space-y-4">
                <form onSubmit={handleYouTubeSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="youtube-url">YouTube Video URL</Label>
                    <Input
                      id="youtube-url"
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      disabled={processing !== 'idle'}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!youtubeUrl.trim() || processing !== 'idle'}
                    className="w-full"
                  >
                    {processing === 'idle' ? 'Download & Transcribe' : 'Processing...'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="mp4" className="space-y-4">
                <form onSubmit={handleFileUpload} className="space-y-4">
                  <div>
                    <Label htmlFor="mp4-file">MP4 Video File</Label>
                    <Input
                      id="mp4-file"
                      type="file"
                      accept=".mp4,video/mp4"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      disabled={processing !== 'idle'}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!selectedFile || processing !== 'idle'}
                    className="w-full"
                  >
                    {processing === 'idle' ? 'Upload & Transcribe' : 'Processing...'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="mp3" className="space-y-4">
                <form onSubmit={handleFileUpload} className="space-y-4">
                  <div>
                    <Label htmlFor="mp3-file">MP3 Audio File</Label>
                    <Input
                      id="mp3-file"
                      type="file"
                      accept=".mp3,audio/mp3"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      disabled={processing !== 'idle'}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!selectedFile || processing !== 'idle'}
                    className="w-full"
                  >
                    {processing === 'idle' ? 'Upload & Transcribe' : 'Processing...'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {(processing === 'complete' || processing === 'error') && (
              <div className="mt-6 text-center">
                <Button onClick={resetApp} variant="outline">
                  Start New Transcription
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
