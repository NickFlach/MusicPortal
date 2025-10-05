# Ninja-Portal

## Overview
Ninja-Portal is a decentralized music streaming and AI intelligence platform leveraging Web3 technologies, data-less AI processing, and statistical physics-based network optimization. It integrates music streaming with real-time synchronization, geolocation mapping, and dimensional analysis through its evolutionary AI engine, Lumira. The platform aims to provide a seamless cross-device user experience, utilizing IPFS for storage, PostgreSQL with Drizzle ORM, and React for a modern UI. Its core ambition is to offer intelligent music discovery via a multi-agent orchestrator that analyzes natural language queries.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript, Vite, Radix UI, and Tailwind CSS.
- **State Management**: Context-based architecture, React Query for server state.
- **Routing**: Wouter for lightweight client-side routing.
- **3D Graphics**: React Three Fiber for interactive visualizations.
- **Design**: Mobile-first, responsive.

### Backend
- **Server**: Express.js with TypeScript, RESTful API.
- **Real-time**: WebSocket integration for music sync and live statistics.
- **Database**: Drizzle ORM with PostgreSQL.
- **Modularity**: Organized routes and dedicated services for AI, encryption, IPFS, and dimensional balancing.

### Data Storage
- **Primary**: PostgreSQL (Neon serverless) for structured data.
- **Decentralized**: IPFS for audio files, supported by Pinata gateway.
- **Schema**: Comprehensive design for users, songs, playlists, and analytics.
- **Migrations**: Drizzle Kit for schema management.
- **Database Extensions**: `pgvector` for embeddings (HNSW index), GIN index for full-text search.

### Authentication
- **Web3**: Wagmi for Ethereum wallet integration.
- **Identity**: Wallet address-based authentication.
- **Access Control**: Role-based admin system for treasury management.

### Deep Research System
- **Purpose**: Multi-agent orchestrator for intelligent music discovery via natural language queries.
- **Orchestrator**: Coordinates 5 specialized search agents based on AI analysis of user queries (or deterministic fallback).
- **Search Agents**:
    - **SemanticSearchAgent**: Uses OpenAI/X.AI embeddings and `pgvector` for similarity search.
    - **KeywordSearchAgent**: PostgreSQL full-text search with BM25-style ranking.
    - **UserBehaviorAgent**: Personalized recommendations (currently a placeholder for popular songs).
    - **MusicIntelligenceAgent**: Analyzes metadata (genre, mood, tempo).
    - **RadioDiscoveryAgent**: Integrates with Radio Browser API for internet radio.
- **Performance**: LRU caching for embeddings, parallel agent execution, database indexing (HNSW, GIN).
- **API**: `/api/research/deep-search` for queries, `/api/research/clarify` for follow-ups, `/api/research/status` for service availability.
- **Frontend Integration**: Conversational chat interface on `/discovery` page with real-time feedback and direct music playback.

## External Dependencies

### Blockchain and Web3
- **Wagmi**: Ethereum wallet integration.
- **NEO Blockchain**: Smart contracts for tokenized incentives.
- **Custom Chain**: Chain ID 47763 for internal operations.

### Storage and Content Delivery
- **IPFS/Pinata**: Decentralized storage for audio, custom gateway used.
- **Neon Database**: Serverless PostgreSQL with WebSocket support.

### AI and Machine Learning
- **OpenAI/X.AI**: Mood analysis, content interpretation, semantic search.
- **Google Cloud Translate**: Multi-language support with RAG-based translation.
- **Custom Lumira AI**: Dimensional analysis and network optimization.

### External APIs and Services
- **Radio Browser API**: Internet radio station access.
- **Google Maps API**: Geolocation and mapping.

## Deep Research System Setup and Configuration

### Required Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (provided by Replit/Neon)
- `OPENAI_API_KEY` OR `XAI_API_KEY`: For semantic search and query analysis

### Setting Up API Keys
1. **For X.AI (Grok)**:
   - Get API key from https://console.x.ai
   - Add to Replit Secrets: `XAI_API_KEY`
   - Model used: `grok-2-1212`

2. **For OpenAI**:
   - Get API key from https://platform.openai.com
   - Add to Replit Secrets: `OPENAI_API_KEY`
   - Model used: `text-embedding-3-small` for embeddings

### Generating Embeddings
**IMPORTANT**: Embeddings are NOT auto-generated. To enable semantic search:

```typescript
// In server console or setup script:
import { embeddingService } from './services/embeddings';
await embeddingService.updateMissingEmbeddings();
```

### Fallback Behavior
- **No API Keys**: Semantic search returns empty results, system falls back to keyword search
- **No Embeddings**: Semantic agent skipped, other agents continue
- **Minimum Functionality**: Keyword search and radio discovery work without any API keys

### Production Deployment Checklist
1. ✅ Add OPENAI_API_KEY or XAI_API_KEY to secrets
2. ✅ Run embedding generation for all songs
3. ✅ Verify pgvector extension is enabled
4. ✅ Check HNSW and GIN indexes exist
5. ✅ Test semantic search with sample query
6. ✅ Verify keyword search fallback works
7. ✅ Test Discovery UI at /discovery route

## Current Limitations and Caveats

### UserBehaviorAgent (Placeholder Implementation)
- **Current**: Returns popular songs sorted by votes
- **Missing**: True user behavior tracking (recently played, loved songs, listening patterns)
- **Confidence**: Set to 0.6 to indicate proxy data
- **Planned**: Collaborative filtering with user interaction history

### Manual Embedding Generation
- Embeddings must be manually triggered
- No automatic updates when new songs added
- Batch processing (100 songs at a time)
- LRU cache helps reduce API calls

### API Key Dependencies
- Semantic search requires OPENAI_API_KEY or XAI_API_KEY
- Costs: ~$0.02 per 1000 embeddings (OpenAI)
- No semantic search without valid API credentials
- Fallback to keyword search is automatic

### Incomplete User Context Schema
- Recently played songs tracking not implemented
- Loved songs association missing wallet-specific data
- Preferred genres not stored per user
- Mood preferences not tracked

### Production Readiness
⚠️ **The Deep Research system is functional but has the following known issues:**
1. Embeddings require manual generation
2. UserBehaviorAgent is a placeholder
3. No automated embedding pipeline
4. API keys required for full functionality
5. User context tracking incomplete
6. No session-based query history

## Future Enhancements (Roadmap)

These features are planned for future development:

- **Session-based Context**: Retain query context across multiple searches in a conversation
- **Learning Agent Selection**: Improve orchestrator strategy based on query success patterns
- **Playlist Analysis Agent**: Analyze playlist structures and recommend similar collections
- **Mood Detection Agent**: Advanced sentiment analysis for emotional music discovery
- **Real-time Collaborative Filtering**: Learn from all users' behavior for better recommendations
- **Audio Feature Extraction**: Analyze tempo, key, energy, danceability for similarity matching
- **Automated Embedding Pipeline**: Background job to generate embeddings for new songs
- **User Preference Learning**: Track and learn from user interactions over time