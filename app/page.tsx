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
import { Upload, Youtube, FileAudio, AlertTriangle, Radio } from 'lucide-react';

type ProcessingStep = 'idle' | 'downloading' | 'extracting' | 'transcribing' | 'complete' | 'error';

interface TranscriptResult {
  filename: string;
  txtContent: string;
  jsonContent: string;
  txtDownloadUrl: string;
  jsonDownloadUrl: string;
}

interface PodcastEpisode {
  title: string;
  description: string;
  pubDate: string;
  audioUrl: string;
  duration?: string;
  guid: string;
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

function EpisodeSelectionDialog({ 
  open, 
  onClose, 
  episodes, 
  onSelectEpisode 
}: { 
  open: boolean, 
  onClose: () => void, 
  episodes: PodcastEpisode[], 
  onSelectEpisode: (episode: PodcastEpisode) => void 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  
  if (!open) return null;

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const truncateDescription = (description: string, maxLength: number = 150) => {
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength) + '...';
  };

  const formatDuration = (duration: string | undefined) => {
    if (!duration) return '';
    
    // Convert duration to seconds if it's in seconds format
    let totalSeconds: number;
    
    // Check if duration is already in HH:MM:SS format
    if (duration.includes(':')) {
      const parts = duration.split(':').map(Number);
      if (parts.length === 3) {
        totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        totalSeconds = parts[0] * 60 + parts[1];
      } else {
        totalSeconds = parseInt(duration);
      }
    } else {
      totalSeconds = parseInt(duration);
    }
    
    if (isNaN(totalSeconds)) return duration;
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Filter episodes based on search query
  const filteredEpisodes = episodes.filter(episode =>
    episode.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    episode.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[80vh] p-6 relative">
        <h2 className="text-lg font-semibold mb-4">Select Podcast Episode</h2>
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-500 hover:text-gray-700 text-xl">&times;</button>
        
        <div className="mb-4">
          <Input
            type="text"
            placeholder="Search episodes by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        
        <div className="overflow-auto max-h-[50vh] space-y-3">
          {filteredEpisodes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? 'No episodes found matching your search.' : 'No episodes available.'}
            </div>
          ) : (
            filteredEpisodes.map((episode) => (
            <div 
              key={episode.guid} 
              className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onSelectEpisode(episode)}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-900 flex-1 pr-4">{episode.title}</h3>
                <div className="text-xs text-gray-500 flex flex-col items-end">
                  {episode.duration && <span>{formatDuration(episode.duration)}</span>}
                  <span>{formatDate(episode.pubDate)}</span>
                </div>
              </div>
              <p className="text-sm text-gray-600">{truncateDescription(episode.description)}</p>
            </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('youtube');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [podcastUrl, setPodcastUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState<ProcessingStep>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [result, setResult] = useState<TranscriptResult | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogContent, setDialogContent] = useState('');
  const [episodeDialogOpen, setEpisodeDialogOpen] = useState(false);
  const [availableEpisodes, setAvailableEpisodes] = useState<PodcastEpisode[]>([]);

  const getStepMessage = (step: ProcessingStep) => {
    switch (step) {
      case 'downloading': return 'Downloading content...';
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

  const handlePodcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!podcastUrl.trim()) return;

    setProcessing('downloading');
    setProgress(10);
    setError(null);
    setResult(null);

    try {
      // First, detect URL type and get episodes if RSS
      const podcastResponse = await fetch('/api/podcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: podcastUrl }),
      });

      if (!podcastResponse.ok) {
        const errorData = await podcastResponse.json();
        throw new Error(errorData.error || 'Failed to process podcast URL');
      }

      const podcastData = await podcastResponse.json();

      if (podcastData.type === 'rss') {
        // Show episode selection dialog
        setAvailableEpisodes(podcastData.episodes);
        setEpisodeDialogOpen(true);
        setProcessing('idle');
        setProgress(0);
      } else if (podcastData.type === 'audio') {
        // Direct audio URL - proceed to transcription
        setProcessing('transcribing');
        setProgress(50);

        const transcribeResponse = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioUrl: podcastData.audioUrl, filename: podcastData.title, isPodcast: true }),
        });

        if (!transcribeResponse.ok) {
          const errorData = await transcribeResponse.json();
          throw new Error(errorData.message || 'Failed to transcribe audio');
        }

        const transcriptData = await transcribeResponse.json();
        setResult(transcriptData);
        setProcessing('complete');
        setProgress(100);
      }

    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      setErrorDetails(error instanceof Error ? error.stack || 'No additional details' : 'Unknown error');
      setProcessing('error');
      setProgress(0);
    }
  };

  const handleEpisodeSelect = async (episode: PodcastEpisode) => {
    setEpisodeDialogOpen(false);
    setProcessing('downloading');
    setProgress(30);

    try {
      // Download selected episode
      const downloadResponse = await fetch('/api/podcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: podcastUrl, selectedEpisode: episode }),
      });

      if (!downloadResponse.ok) {
        const errorData = await downloadResponse.json();
        throw new Error(errorData.error || 'Failed to download episode');
      }

      const { audioUrl, title } = await downloadResponse.json();
      
      setProcessing('transcribing');
      setProgress(60);

      // Transcribe audio
      const transcribeResponse = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl, filename: title, isPodcast: true }),
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
    setPodcastUrl('');
    setSelectedFile(null);
    setEpisodeDialogOpen(false);
    setAvailableEpisodes([]);
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
              <TabsList className="grid w-full grid-cols-4">
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
                <TabsTrigger value="podcast" className="flex items-center gap-2">
                  <Radio className="h-4 w-4" />
                  Podcast
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

              <TabsContent value="podcast" className="space-y-4">
                <form onSubmit={handlePodcastSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="podcast-url">Podcast RSS Feed or Direct Audio URL</Label>
                    <Input
                      id="podcast-url"
                      type="url"
                      placeholder="https://feeds.megaphone.fm/... or https://example.com/episode.mp3"
                      value={podcastUrl}
                      onChange={(e) => setPodcastUrl(e.target.value)}
                      disabled={processing !== 'idle'}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!podcastUrl.trim() || processing !== 'idle'}
                    className="w-full"
                  >
                    {processing === 'idle' ? 'Process Podcast' : 'Processing...'}
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
      <EpisodeSelectionDialog 
        open={episodeDialogOpen} 
        onClose={() => setEpisodeDialogOpen(false)} 
        episodes={availableEpisodes}
        onSelectEpisode={handleEpisodeSelect}
      />
    </div>
  );
}
