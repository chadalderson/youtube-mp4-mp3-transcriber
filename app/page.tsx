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
import { Upload, Youtube, FileAudio, AlertTriangle } from 'lucide-react';

type ProcessingStep = 'idle' | 'downloading' | 'extracting' | 'transcribing' | 'complete' | 'error';

interface TranscriptResult {
  filename: string;
  txtContent: string;
  jsonContent: string;
  txtDownloadUrl: string;
  jsonDownloadUrl: string;
}

function Dialog({ open, onClose, title, children }: { open: boolean, onClose: () => void, title: string, children: string }) {
  const [copied, setCopied] = useState(false);
  if (!open) return null;
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-500 hover:text-gray-700">&times;</button>
        <div className="flex items-center mb-2">
          <button
            onClick={handleCopy}
            className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200 border border-gray-200 mr-2"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div className="overflow-auto max-h-96 whitespace-pre-wrap text-sm">
          {children}
        </div>
      </div>
    </div>
  );
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogContent, setDialogContent] = useState('');

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

    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      setErrorDetails(error instanceof Error ? error.stack || 'No additional details' : 'Unknown error');
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

    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      setErrorDetails(error instanceof Error ? error.stack || 'No additional details' : 'Unknown error');
      setProcessing('error');
      setProgress(0);
    }
  };

  const handleViewFile = async (url: string, title: string) => {
    setDialogTitle(title);
    setDialogContent('Loading...');
    setDialogOpen(true);
    try {
      // Extract the relative file path from the download URL
      let filePath = url;
      if (filePath.startsWith('/')) filePath = filePath.slice(1);
      const apiUrl = `/api/files?path=${encodeURIComponent(filePath)}`;
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error('File not found');
      const text = await res.text();
      setDialogContent(text);
    } catch {
      setDialogContent('Failed to load file.');
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

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    resetApp(); // Reset form when switching tabs
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
                    <Button size="sm" onClick={() => handleViewFile(result.txtDownloadUrl, 'TXT Preview')}>
                      View TXT
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleViewFile(result.jsonDownloadUrl, 'JSON Preview')}>
                      View JSON
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

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="youtube" className="flex items-center gap-2">
                  <Youtube className="h-4 w-4" />
                  YouTube Video
                </TabsTrigger>
                <TabsTrigger value="mp4" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Video
                </TabsTrigger>
                <TabsTrigger value="mp3" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Audio
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
                    <Label htmlFor="audio-file">Audio File</Label>
                    <Input
                      id="audio-file"
                      type="file"
                      accept=".mp3,audio/mp3,.m4a,audio/m4a"
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
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={dialogTitle}>
        {dialogContent}
      </Dialog>
    </div>
  );
}
