# Ninja-Portal

## Overview

Ninja-Portal is a decentralized music streaming and AI intelligence platform that combines Web3 technologies, data-less AI processing, and statistical physics-based network optimization. The system integrates music streaming with real-time synchronization, geolocation mapping, and dimensional analysis through an evolutionary AI engine called Lumira. Built on a full-stack TypeScript architecture, it features IPFS storage, PostgreSQL with Drizzle ORM, and React with advanced UI components for a seamless user experience across devices.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React with TypeScript**: Modern component-based architecture using functional components and hooks
- **Vite Build System**: Fast development and production builds with hot module replacement
- **UI Framework**: Radix UI components with Tailwind CSS for consistent design system
- **State Management**: Context-based architecture with React Query for server state and custom contexts for music player, WebSocket sync, and dimensional analysis
- **Routing**: Wouter for lightweight client-side routing
- **3D Graphics**: React Three Fiber for 3D network visualization and interactive elements
- **Responsive Design**: Mobile-first approach with adaptive layouts and device detection

### Backend Architecture
- **Express.js Server**: RESTful API with TypeScript, serving both API endpoints and static files
- **WebSocket Integration**: Real-time communication for music synchronization and live statistics
- **Database Layer**: Drizzle ORM with PostgreSQL for structured data storage including users, songs, playlists, and analytics
- **Modular Route Structure**: Organized endpoints for music, playlists, users, admin, translations, and AI services
- **Service Layer**: Dedicated services for AI interpretation, encryption, IPFS connections, and dimensional balancing

### Data Storage Solutions
- **PostgreSQL Database**: Primary data store using Neon serverless database with connection pooling
- **IPFS Integration**: Decentralized file storage for audio files with Pinata gateway support
- **Schema Design**: Comprehensive database schema supporting users, songs, playlists, loves (likes), followers, and recent play tracking
- **Migration System**: Drizzle Kit for database schema migrations and version control

### Authentication and Authorization
- **Web3 Wallet Integration**: Wagmi for Ethereum wallet connections and user authentication
- **Address-Based Auth**: User identification through wallet addresses rather than traditional accounts
- **Admin System**: Role-based access control with admin privileges for treasury management
- **Session Management**: Stateless authentication with wallet signatures and address verification

### External Dependencies

#### Blockchain and Web3
- **Wagmi**: Ethereum wallet integration and contract interactions
- **NEO Blockchain**: Smart contracts for tokenized incentives and treasury management
- **Custom Chain Configuration**: Chain ID 47763 with GAS token support

#### Storage and Content Delivery
- **IPFS/Pinata**: Decentralized file storage and custom gateway (blush-adjacent-octopus-823.mypinata.cloud)
- **Neon Database**: Serverless PostgreSQL with WebSocket support for real-time connections

#### AI and Machine Learning Services
- **OpenAI/X.AI Integration**: AI-powered mood analysis and content interpretation
- **Google Cloud Translate**: Multi-language support with RAG-based translation system
- **Custom Lumira AI**: Dimensional analysis and network optimization engine

#### External APIs and Services
- **Radio Browser API**: Access to internet radio stations for streaming integration
- **Google Maps API**: Geolocation services and mapping functionality for listener visualization
- **Translation Services**: Multi-language support with automated content localization

#### Development and Deployment
- **Replit Environment**: Cloud development with specific Vite plugins for theme management
- **ESBuild**: Fast bundling for production server builds
- **Vitest**: Testing framework with React Testing Library integration
- **TypeScript**: Full type safety across frontend and backend with strict configuration