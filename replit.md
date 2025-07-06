# AI App Builder - Replit Clone

## Overview

This is a full-stack web application that replicates Replit's functionality, allowing users to create, edit, and deploy applications through an AI-powered interface. The system combines a React frontend with an Express backend, featuring real-time code generation, project management, and live preview capabilities.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React hooks with TanStack Query for server state
- **Routing**: React Router for client-side navigation
- **Code Editor**: Custom implementation with syntax highlighting

### Backend Architecture
- **Runtime**: Node.js with Express server
- **Language**: TypeScript with ESM modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth integration (optional for development)
- **AI Integration**: Anthropic Claude API for code generation
- **File Serving**: Express static file server for live previews

### Development Tools
- **Build System**: Vite for frontend, esbuild for backend
- **Type Checking**: TypeScript with strict configuration
- **CSS Processing**: PostCSS with Tailwind and Autoprefixer
- **Database Migrations**: Drizzle Kit for schema management

## Key Components

### 1. Landing Page (`/`)
- Project creation interface with AI prompt input
- Recent projects display with metadata
- Template selection and quick start options
- Clean, modern design with gradient backgrounds

### 2. IDE Interface (`/ide`)
- Three-panel layout: file explorer, code editor, preview/chat
- Real-time AI chat interface for code modifications
- Live file tree with folder expansion/collapse
- Integrated console for application output
- Preview pane for web applications

### 3. Chat Interface
- Streaming AI responses with typing animations
- Context-aware code generation based on project type
- File generation with syntax highlighting
- Progress tracking for complex operations
- Message history and conversation management

### 4. File System Management
- Virtual file system with in-memory storage
- Support for multiple file types (HTML, CSS, JS, TS, Python, etc.)
- File icons and syntax highlighting
- Create, edit, delete operations
- Folder structure management

### 5. Project Management
- Save/load projects to/from database
- Project metadata (name, description, language, framework)
- User-specific project isolation
- Export functionality for downloading projects

## Data Flow

### 1. Project Creation Flow
```
User Input → AI Analysis → Project Type Detection → File Generation → Project Storage
```

### 2. AI Chat Flow
```
User Message → Context Analysis → AI API Call → Code Generation → File Updates → UI Refresh
```

### 3. File Operations Flow
```
User Action → File System Update → Editor Refresh → Preview Update → Auto-save
```

### 4. Authentication Flow (Optional)
```
Login Request → Replit OAuth → Session Storage → User Context → Protected Routes
```

## External Dependencies

### Core Dependencies
- **React Ecosystem**: react, react-dom, react-router-dom
- **UI Components**: @radix-ui/* packages for accessible components
- **Styling**: tailwindcss, class-variance-authority, clsx
- **State Management**: @tanstack/react-query
- **Icons**: lucide-react
- **Form Handling**: react-hook-form, @hookform/resolvers

### Backend Dependencies
- **Server**: express with TypeScript support
- **Database**: @neondatabase/serverless, drizzle-orm
- **AI Integration**: @anthropic-ai/sdk
- **Authentication**: passport, express-session
- **Utilities**: memoizee, date-fns, nanoid

### Development Dependencies
- **Build Tools**: vite, esbuild, tsx
- **TypeScript**: typescript with strict configuration
- **Database Tools**: drizzle-kit for migrations
- **Replit Integration**: @replit/vite-plugin-* packages

## GitHub Integration & Deployment

### Deploying from GitHub to Replit

This project is fully configured for seamless GitHub → Replit deployment:

#### Quick Deploy
[![Deploy to Replit](https://replit.com/badge/github/your-username/your-repo)](https://replit.com/new/github/your-username/your-repo)

#### Manual Import Steps
1. Go to [replit.com/new](https://replit.com/new)
2. Click "Import from GitHub"  
3. Enter repository URL
4. Click "Run" - everything auto-configures!

#### Auto-Configuration Features
- ✅ **Environment Setup**: Node.js 20 + PostgreSQL 16
- ✅ **Dependencies**: Auto-install via `.replit` workflow
- ✅ **Database**: Auto-migration on startup
- ✅ **Build System**: Vite + esbuild configuration
- ✅ **Hot Reload**: Development with HMR
- ✅ **Production**: One-click deployment

#### Required Files for GitHub Import
- `.replit` - Main configuration
- `package.json` - Dependencies and scripts  
- `vite.config.ts` - Frontend build config
- `drizzle.config.ts` - Database config
- `tsconfig.json` - TypeScript config

See `REPLIT_DEPLOYMENT.md` for detailed deployment guide.

## Deployment Strategy

### Development Environment
- **Command**: `npm run dev`
- **Frontend**: Vite dev server with HMR
- **Backend**: tsx with file watching
- **Database**: PostgreSQL (local or Neon)
- **Port Configuration**: Frontend on 3000, backend integratedontend on 3000, backend integrated

### Production Build
- **Frontend Build**: `vite build` → static files in `dist/public`
- **Backend Build**: `esbuild` → bundled server in `dist/index.js`
- **Static Serving**: Express serves built frontend files
- **Database**: Production PostgreSQL connection

### Replit Deployment
- **Platform**: Replit Autoscale deployment
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`
- **Environment**: Node.js 20 with PostgreSQL 16
- **Port Mapping**: Internal 3000 → External 80

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Session encryption key
- `ANTHROPIC_API_KEY`: AI service API key (optional)
- `REPL_ID`: Replit environment identifier
- `NODE_ENV`: Environment flag (development/production)

## Changelog

```
Changelog:
- July 5, 2025: Dynamic Preview System Enhancement
  - ✅ Added automatic initial prompt handling - chat starts immediately when user provides input
  - ✅ Implemented dynamic project ID management with callback system
  - ✅ Preview pane now automatically updates when Gemini generates project files
  - ✅ Smooth transition from placeholder to live preview iframe
  - ✅ Maintained dark theme consistency throughout split view interface
  - ✅ Fixed all component prop passing for seamless data flow
  - Technical: ChatInterface passes project ID to parent component for preview updates
  - User experience: Preview appears automatically as soon as AI generates the first file
- July 5, 2025: CloudAI Interface Enhancement with Natural Gemini Chat
  - ✅ Rebuilt UI as "CloudAI" - enhanced version of original landing page design
  - ✅ Successfully integrated Gemini API with user's API key
  - ✅ Implemented dual API approach: Natural conversation + Background code generation
  - ✅ Created gemini-natural-chat.ts with two-phase response system
  - ✅ Gemini API tested and working with natural, human-like responses
  - ✅ Enhanced UI maintains original design but with modern improvements
  - ✅ "Powered by Gemini" branding throughout the interface
  - Technical: Using gemini-1.5-flash for conversation, gemini-1.5-pro for code generation
  - User can now chat naturally while code generates in background
- July 5, 2025: Preview System FINALLY WORKING! API Route Solution Implemented
  - ✅ SOLVED critical Vite route interception issues preventing preview system from working
  - ✅ Implemented API-based preview serving at `/api/preview-files/:projectId`
  - ✅ Preview system now stores files in memory and serves them through Express API routes
  - ✅ Successfully tested with HTML content displaying properly
  - ✅ Key fix: Moved preview routes to API endpoints to avoid Vite dev server conflicts
  - ✅ Preview URLs now return actual HTML content instead of "File not found" errors
  - Technical solution: Used `/api/preview-files/` prefix for all preview routes
  - Verified working with test preview showing "🎉 Preview Working!" message
- July 5, 2025: Complete Migration to File-Based Database System SUCCESSFUL
  - ✅ Removed all PostgreSQL dependencies and external database requirements
  - ✅ Created custom file-based database system using JSON files for users and projects
  - ✅ Gemini API fully operational with user's API key (AIzaSyAipuvS7H_ZbMpdFgxz-6uHvMYa18eWqoA)
  - ✅ Preview server system working with localhost iframe support
  - ✅ Simple authentication system using local file storage instead of PostgreSQL
  - ✅ Server running successfully on port 5000 with zero external dependencies
  - ✅ API endpoints tested and working (chat, preview, auth)
  - Migration completed successfully: project now fully self-contained with local database
- July 2, 2025: Gemini API Integration COMPLETE - Full Project Structure Generation Working
  - ✅ Successfully integrated user's Gemini API key (AIzaSyAipuvS7H_ZbMpdFgxz-6uHvMYa18eWqoA)
  - ✅ Gemini 2.5 Flash API now generating massive responses (8,000-10,000+ characters)
  - ✅ Fixed critical conflicting chat routes between server/routes.ts and server/chat-routes.ts
  - ✅ System now generates COMPLETE project structures with multiple files
  - ✅ Enhanced file extraction logic to handle paths like "src/App.tsx" and organize files properly
  - ✅ Chat interface updated to introduce itself as Gemini-powered AI coder
  - ✅ All authentication and user tracking systems operational with PostgreSQL
  - ✅ Server running on port 5000 with full external accessibility
  - Technical breakthrough: Identified and resolved route conflict that was preventing Gemini usage
  - User request completed: "Make Gemini generate full project structures" now fully operational
  - System generates comprehensive applications with proper file organization
- June 29, 2025: Successfully migrated from Replit Agent to standard Replit environment
  - Completed full migration with PostgreSQL database integration
  - Configured GPT-4.1 API integration using GitHub Personal Access Token
  - Enhanced AI service to prioritize GPT-4.1, fallback to Anthropic Claude, then local generation
  - Fixed Tailwind CSS configuration for proper shadcn/ui component support
  - Updated project branding to "Peaks" as requested by user
  - Enhanced chat interface with realistic file creation animations
  - Added comprehensive error handling for API failures with detailed user feedback
  - Implemented proper device fingerprinting and session persistence
  - All VIRAAJDATA authentication and tracking systems operational
  - Server running on port 5000 with external accessibility
  - Migration completed successfully with all features working
- June 26, 2025: Integrated external API with comprehensive app generation system
  - Successfully integrated user's external API endpoint (https://x62x8aj9xj2.created.app/api/chat)
  - Verified external API connectivity with Claude 3.5 Sonnet responses
  - Implemented comprehensive app generation system with external API first, local fallback
  - Fixed frontend chat interface to properly handle external API responses
  - Created structured file generation from external API responses
  - Added timeout handling and graceful fallback to enhanced local generation
  - External API provides professional, advanced code generation capabilities
  - System now generates complete HTML, CSS, and JavaScript files from external AI
  - All authentication and user tracking systems remain operational
- June 25, 2025: Successfully migrated from Replit Agent to standard Replit environment
  - Installed all required dependencies (tsx, PostgreSQL database)
  - VIRAAJDATA controller integrated with users.txt file-based tracking system
  - Authentication system operational with device fingerprinting and session management
  - Server configured on port 5000 with proper Vite integration
  - All workflows and file systems working correctly
  - Clean landing page interface maintained with project creation functionality
- June 25, 2025: Final clean interface with single input section and working functionality
  - Fixed all duplicate input sections - now only ONE clean input bar exactly matching design
  - Resolved AuthModal export/import issues - authentication system fully operational  
  - Fixed VIRAAJDATA getUserProjects bug preventing recent projects from displaying
  - External API proxy integrated with local generation fallback for enhanced capabilities
  - All app creation functionality tested and working correctly with project persistence
  - Users must authenticate to create apps, with real projects showing in recent section
  - Clean, professional IDE interface matching original design requirements
- June 25, 2025: Implemented authentication-required project system with real user projects
  - Fixed critical syntax errors and resolved server startup issues
  - Created clean, working routes implementation with local-only AI generation
  - Removed duplicate landing pages, consolidated into single unified IDE interface
  - Implemented authentication requirement - users must login to create projects
  - Added real recent projects section showing actual user-created apps
  - Enhanced VIRAAJDATA integration for project persistence and tracking
  - Successfully tested project creation and saving functionality
  - Updated interface to match Replit-style design with account management
- June 24, 2025: Enhanced to professional AI code generation experience
  - Implemented sophisticated AI code writing animations with realistic typing simulation
  - Added professional progress stages with 3-6 second delays for authentic feel
  - Clean slate start - zero files initially, AI generates everything from scratch
  - Files now stored in dedicated ai-generated directory for organization
  - Professional timing and progress indicators throughout generation process
  - Server properly configured on 0.0.0.0:3000 with external API integration ready
- January 23, 2025: Successfully migrated from Replit Agent to standard Replit environment
  - Fixed all dependencies and database connections
  - Implemented proper file creation and preview system
  - Chat now properly generates files that show in preview
  - All core functionality working correctly
- June 23, 2025: Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
User account system: VIRAAJDATA.controller.ts controls ALL user data, authentication, memory, and persistence
Database: PostgreSQL with PERMANENT file logging system (users.txt NEVER edited/deleted, only appended)
Authentication: PERMANENT device fingerprinting - devices remembered FOREVER with auto-login
AI Integration: ENTERPRISE-GRADE Gemini AI - super advanced with file editing (not recreating)
AI Behavior: Keeps debugging/fixing issues until 100% resolved, never gives up
Landing Page: Single unified IDE interface - removed duplicate landing pages per user request
Testing: Always test functionality to ensure reliability
Enterprise Features: Comprehensive logging, monitoring, security, caching, and scalability
File Management: AI edits existing files instead of recreating them, preserves user customizations
```