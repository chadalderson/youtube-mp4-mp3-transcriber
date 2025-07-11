# Claude Configuration for YouTube Transcription App

## Project Overview
A Next.js 15 web application for downloading YouTube videos, processing podcast feeds, and transcribing audio files using AssemblyAI. Built with TypeScript, React 19, Shadcn UI, and Tailwind CSS.

## Tech Stack & Conventions

### Core Technologies
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript (strict mode)
- **UI Framework**: React 19
- **Styling**: Tailwind CSS v4
- **UI Components**: Shadcn UI + Radix UI
- **Icons**: Lucide React
- **Audio Processing**: FFmpeg via fluent-ffmpeg
- **YouTube Download**: yt-dlp-wrap
- **Transcription**: AssemblyAI SDK
- **Podcast Processing**: rss-parser

### Development Commands
- **Dev Server**: `npm run dev` (uses Turbopack)
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Start Production**: `npm start`

## Code Style & Conventions

### File Structure
```
app/
├── api/                    # API routes (Next.js App Router)
│   ├── files/route.ts     # File serving
│   ├── podcast/route.ts   # Podcast RSS parsing
│   ├── transcribe/route.ts # Audio transcription
│   ├── upload/route.ts    # File uploads
│   └── youtube-download/route.ts # YouTube downloads
├── layout.tsx             # Root layout
└── page.tsx              # Home page

components/
└── ui/                    # Shadcn UI components
    ├── button.tsx
    ├── card.tsx
    ├── input.tsx
    └── ...

lib/
└── utils.ts              # Utility functions (cn, etc.)
```

### TypeScript Guidelines
- Use strict TypeScript configuration
- Define interfaces for all data structures
- Use proper typing for API responses
- Import types with `type` keyword when importing only types

### React Conventions
- Use functional components with hooks
- Prefer `'use client'` directive for client components
- Use proper state management with useState
- Follow React 19 patterns and features

### Styling Guidelines
- Use Tailwind CSS for all styling
- Follow Shadcn UI component patterns
- Use CSS-in-JS via `cva` (class-variance-authority) for component variants
- Use `cn()` utility for conditional classes
- Prefer semantic color tokens (primary, secondary, destructive, etc.)

### Component Patterns
- Import UI components from `@/components/ui/`
- Use Radix UI primitives for accessibility
- Follow Shadcn naming conventions
- Use Lucide React for icons

### API Route Conventions
- Use Next.js App Router API routes (`route.ts`)
- Handle GET/POST methods appropriately
- Return proper HTTP status codes
- Use TypeScript interfaces for request/response types
- Handle errors gracefully with try/catch

### File Upload & Processing
- Store uploads in `/uploads/` directory (gitignored)
- Use fluent-ffmpeg for audio extraction
- Support MP4 → MP3 conversion
- Handle large file uploads properly

### Environment Variables
- Store sensitive keys in `.env.local`
- Required: `ASSEMBLYAI_API_KEY`
- Never commit environment files

## Best Practices

### Security
- Never expose API keys in client-side code
- Validate all user inputs
- Sanitize file uploads
- Use proper error handling without exposing internals

### Performance
- Use Next.js optimizations (Image, dynamic imports)
- Implement proper loading states
- Handle large file processing asynchronously
- Use Turbopack for development

### Error Handling
- Show user-friendly error messages
- Log errors appropriately
- Handle network failures gracefully
- Provide fallback UI states

### Accessibility
- Use Radix UI for accessible components
- Provide proper ARIA labels
- Support keyboard navigation
- Ensure color contrast compliance

## Testing & Quality
- Run `npm run lint` before commits
- Test file upload functionality
- Verify transcription accuracy
- Test YouTube download edge cases

## Dependencies Management
- Keep dependencies updated
- Use exact versions for critical packages
- Document any peer dependency requirements
- Test compatibility after updates

## Common Tasks

### Adding New Features
1. Create TypeScript interfaces for data structures
2. Implement API routes in `app/api/`
3. Build UI components using Shadcn patterns
4. Add proper error handling and loading states
5. Test with various input formats

### UI Component Creation
1. Use Shadcn CLI or copy existing patterns
2. Implement proper TypeScript props interfaces
3. Use `cva` for variant styling
4. Add proper accessibility attributes
5. Export from `components/ui/`

### API Route Development
1. Create `route.ts` in appropriate directory
2. Define TypeScript interfaces for requests/responses
3. Implement proper error handling
4. Add input validation
5. Return consistent response formats

## Project-Specific Notes
- FFmpeg must be installed on the system
- yt-dlp binary is included in `app/bin/`
- AssemblyAI provides transcription with speaker diarization
- Supports direct podcast URL and RSS feed parsing
- File uploads are processed asynchronously