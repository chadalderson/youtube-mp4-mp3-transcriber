import { NextRequest, NextResponse } from 'next/server';
import Parser from 'rss-parser';

const parser = new Parser({
  customFields: {
    item: [
      ['itunes:duration', 'duration'],
      ['enclosure', 'enclosure'],
    ],
  },
});

interface PodcastEpisode {
  title: string;
  description: string;
  pubDate: string;
  audioUrl: string;
  duration?: string;
  guid: string;
}

async function detectUrlType(url: string): Promise<'rss' | 'audio' | 'unknown'> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    
    // Check for access errors
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Access denied: This file appears to be private or requires authentication');
      } else if (response.status === 404) {
        throw new Error('File not found: The URL does not exist or has been moved');
      } else if (response.status >= 400) {
        throw new Error(`Unable to access URL: Server returned ${response.status} ${response.statusText}`);
      }
    }
    
    const contentType = response.headers.get('content-type') || '';
    
    // Check for RSS/XML content types
    if (contentType.includes('application/rss+xml') || 
        contentType.includes('text/xml') || 
        contentType.includes('application/xml')) {
      return 'rss';
    }
    
    // Check for audio content types
    if (contentType.includes('audio/')) {
      return 'audio';
    }
    
    // Check URL extension as fallback
    const urlLower = url.toLowerCase();
    if (urlLower.includes('.mp3') || urlLower.includes('.m4a') || 
        urlLower.includes('.wav') || urlLower.includes('.aac')) {
      return 'audio';
    }
    
    // If content-type suggests XML but not specifically RSS, try parsing as RSS
    if (contentType.includes('xml')) {
      return 'rss';
    }
    
    return 'unknown';
  } catch (error) {
    console.error('Error detecting URL type:', error);
    // Re-throw the error to preserve the specific error message
    throw error;
  }
}

async function parseRssFeed(url: string): Promise<PodcastEpisode[]> {
  try {
    const feed = await parser.parseURL(url);
    
    if (!feed.items || feed.items.length === 0) {
      throw new Error('No episodes found in this RSS feed');
    }
    
    const episodes = feed.items.map((item, index) => {
      // Find audio URL from enclosure or link
      let audioUrl = '';
      
      if (item.enclosure && item.enclosure.url) {
        audioUrl = item.enclosure.url;
      } else if (item.link && (item.link.includes('.mp3') || item.link.includes('.m4a') || item.link.includes('.wav') || item.link.includes('.aac'))) {
        audioUrl = item.link;
      }
      
      return {
        title: item.title || `Episode ${index + 1}`,
        description: item.contentSnippet || item.content || 'No description available',
        pubDate: item.pubDate || '',
        audioUrl,
        duration: item.duration || undefined,
        guid: item.guid || `episode-${index}`,
      };
    }).filter(episode => episode.audioUrl); // Only include episodes with audio URLs
    
    if (episodes.length === 0) {
      throw new Error('No audio files found in this RSS feed. Make sure it\'s a podcast feed with audio episodes.');
    }
    
    return episodes;
  } catch (error) {
    console.error('Error parsing RSS feed:', error);
    if (error instanceof Error) {
      // Check for specific RSS parsing errors
      if (error.message.includes('Invalid XML') || error.message.includes('parse')) {
        throw new Error('Invalid RSS feed format. Please check that the URL points to a valid podcast RSS feed.');
      }
      // Re-throw our custom errors
      throw error;
    }
    throw new Error('Failed to parse RSS feed. Please verify the URL is a valid podcast RSS feed.');
  }
}



export async function POST(request: NextRequest) {
  try {
    const { url, selectedEpisode } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    
    // If selectedEpisode is provided, return the audio URL directly (no download needed)
    if (selectedEpisode) {
      return NextResponse.json({
        type: 'audio',
        audioUrl: selectedEpisode.audioUrl,
        title: selectedEpisode.title,
      });
    }
    
    // Detect URL type
    let urlType: 'rss' | 'audio' | 'unknown';
    try {
      urlType = await detectUrlType(url);
    } catch (error) {
      // Return the specific error from detectUrlType (e.g., access denied, not found)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Unable to access the provided URL' },
        { status: 400 }
      );
    }
    
    if (urlType === 'rss') {
      // Parse RSS feed and return episodes
      try {
        const episodes = await parseRssFeed(url);
        return NextResponse.json({
          type: 'rss',
          episodes,
        });
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Failed to parse RSS feed' },
          { status: 400 }
        );
      }
    } else if (urlType === 'audio') {
      // Direct audio URL - return URL directly (no download needed)
      const filename = url.split('/').pop()?.split('?')[0] || 'podcast-episode';
      return NextResponse.json({
        type: 'audio',
        audioUrl: url,
        title: filename,
      });
    } else {
      return NextResponse.json(
        { error: 'Unable to determine if URL is RSS feed or audio file. Please check the URL and try again.' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Podcast API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 