# MusicPortal - Replit Agent Guide

## Overview

MusicPortal is an ambitious experimental platform exploring whether music contains or reveals universal intelligence that transcends human creation. The system combines real-time Web Audio API analysis, autonomous AI pattern recognition, and decentralized Web3 infrastructure to analyze music from all cultures and genres.

**Core Mission**: Discover universal patterns in music through autonomous AI analysis, statistical significance testing, and consciousness metrics (Integrated Information Theory).

**Key Capabilities**:
- Extracts 30+ musical features from audio (tempo, key, harmony, rhythm, timbre, emotion)
- Autonomous hypothesis generation and testing across cultural boundaries
- Real-time music intelligence analysis with pattern detection
- Decentralized storage via IPFS/Pinata
- Web3 integration with MetaMask wallet authentication
- Global music map with live listener tracking
- Advanced search using embeddings, keywords, and AI orchestration

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18 with TypeScript, Vite build system

**UI Library**: Radix UI primitives with Tailwind CSS for styling

**State Management**:
- React Context API for global state (MusicPlayer, WebSocket, DimensionalMusic)
- TanStack Query (React Query) for server state and caching
- Wagmi for Web3/Ethereum wallet state

**Key Design Patterns**:
- Context providers wrap the entire app for cross-cutting concerns (audio playback, WebSocket connections, wallet state)
- Component composition using Radix UI slot pattern
- Error boundaries for graceful failure handling
- Responsive design with mobile-first approach

**Routing**: Wouter for lightweight client-side routing

**Audio Processing**: Web Audio API for real-time feature extraction (FFT analysis, onset detection, spectral analysis) - runs entirely in the browser

### Backend Architecture

**Runtime**: Node.js with Express.js server

**Database ORM**: Drizzle ORM with PostgreSQL (Neon serverless)

**API Design**: RESTful HTTP endpoints + WebSocket for real-time features

**Core Services**:
- **Music Intelligence Engine** (`music-intelligence.ts`): Autonomous AI for pattern detection, hypothesis testing, and consciousness metrics
- **Audio Analysis**: 700+ lines extracting tempo, key, harmony, rhythm, timbre, and emotional features
- **Deep Research Orchestrator**: Multi-agent search system coordinating specialized subagents (semantic, keyword, behavior, radio discovery)
- **Embedding Service**: Vector embeddings using OpenAI/X.AI for semantic search
- **IPFS Connection Manager**: Handles decentralized storage with fallback strategies
- **WebSocket Health Service**: Monitors connection quality and handles leader election for synchronized playback

**Key Design Patterns**:
- Service layer architecture separating business logic from routes
- Event-driven design using EventEmitter for system evolution
- Factory pattern for creating AI agents and search subagents
- Repository pattern via Drizzle ORM for database access

### Data Storage Solutions

**Primary Database**: PostgreSQL (via Neon serverless)

**Schema Design**:
- `users`: Wallet addresses, profiles, admin status
- `songs`: Music metadata with IPFS hashes and optional vector embeddings
- `loves`: Song likes/favorites
- `followers`: Social graph
- `playlists` and `playlistSongs`: User-created collections
- `recentlyPlayed`: Playback history
- `listeners`: Geographic data for music map
- `userRewards`: Token reward tracking

**Vector Search**: Custom vector field type for 1536-dimension embeddings, enabling semantic music discovery

**Decentralized Storage**: IPFS via Pinata for audio files - content-addressed with public gateway fallback

**Caching Strategy**: In-memory LRU cache for embeddings with 1-hour TTL

### Authentication and Authorization

**Primary Auth**: Web3 wallet-based (MetaMask) via Wagmi/viem

**Session Management**: Wallet address in HTTP headers (`x-wallet-address`)

**Authorization Levels**:
- Anonymous: Basic access, read-only
- Authenticated (wallet): Upload music, create playlists, love songs
- Admin: Treasury management, user rewards (set via `isAdmin` flag in database)

**Security Approach**:
- No passwords or traditional auth
- Wallet ownership proves identity
- Smart contract integration for token rewards
- Homomorphic encryption simulation for private metrics (placeholder for production HE library)

### External Dependencies

**AI/ML Services**:
- OpenAI API: Text embeddings (text-embedding-3-small, 1536 dimensions) for semantic search
- X.AI Grok API: Alternative AI provider for embeddings and research orchestration
- Both are optional - system degrades gracefully to keyword search if unavailable

**Web3 Infrastructure**:
- Ethereum Mainnet via Wagmi
- PFORK Token Contract: `0x216490C8E6b33b4d8A2390dADcf9f433E30da60F`
- Treasury Contract: `0xeB57D2e1D869AA4b70961ce3aD99582E84F4F0d4`
- MetaMask for wallet connection

**Storage & CDN**:
- Pinata IPFS service for decentralized file storage
- Custom gateway: `blush-adjacent-octopus-823.mypinata.cloud`
- Fallback to public IPFS gateways (ipfs.io, cloudflare-ipfs.com)

**Translation**:
- Google Cloud Translate API (optional) for internationalization
- RAG-based translation system as fallback

**Radio Integration**:
- Radio Browser API for streaming radio station discovery

**Development Tools**:
- Vite for fast development and HMR
- esbuild for production builds
- Drizzle Kit for database migrations
- Vitest for testing

**Notable Design Decision**: The system prioritizes graceful degradation - if external AI services are unavailable, it falls back to deterministic algorithms (keyword search, statistical analysis). This ensures core music playback and discovery remain functional even without premium AI features.