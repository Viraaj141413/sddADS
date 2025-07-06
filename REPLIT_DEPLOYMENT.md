
# Deploying to Replit from GitHub

This project is fully configured for seamless deployment on Replit. Follow these steps to import and deploy from GitHub.

## 🚀 Quick Deploy to Replit

[![Deploy to Replit](https://replit.com/badge/github/your-username/your-repo)](https://replit.com/new/github/your-username/your-repo)

## 📋 Prerequisites

- GitHub repository with this codebase
- Replit account (free or paid)
- Basic understanding of Node.js applications

## 🔧 Auto-Configuration Files

This project includes all necessary configuration files for Replit:

- **`.replit`** - Main configuration file with run commands and workflows
- **`replit.nix`** - Environment setup (Node.js 20, PostgreSQL 16)
- **`package.json`** - Dependencies and scripts
- **`vite.config.ts`** - Frontend build configuration
- **`drizzle.config.ts`** - Database configuration

## 📂 Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/         # Application pages
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and configurations
│   └── index.html
├── server/                # Backend Express server
│   ├── index.ts          # Main server file
│   ├── routes.ts         # API routes
│   ├── storage.ts        # Database operations
│   └── replit-agent.ts   # AI code generation
├── shared/               # Shared types and schemas
├── .replit              # Replit configuration
└── package.json         # Dependencies and scripts
```

## 🛠️ Manual Import Steps

1. **Create New Repl**
   - Go to [replit.com/new](https://replit.com/new)
   - Click "Import from GitHub"
   - Enter your repository URL: `https://github.com/your-username/your-repo`

2. **Configure Environment**
   ```bash
   # The .replit file automatically configures:
   modules = ["nodejs-20", "web", "postgresql-16"]
   run = "npm run dev"
   ```

3. **Install Dependencies**
   ```bash
   # Run in the shell (auto-executed):
   cd server && npm install && cd .. && npm run dev
   ```

4. **Environment Variables** (Optional)
   ```
   DATABASE_URL=your_neon_database_url
   SESSION_SECRET=your_session_secret
   ANTHROPIC_API_KEY=your_anthropic_key (optional)
   ```

## 🗄️ Database Setup

### Option 1: Use Replit's Built-in PostgreSQL
The project auto-configures with Replit's PostgreSQL. No additional setup needed.

### Option 2: Use External Database (Neon)
1. Create account at [neon.tech](https://neon.tech)
2. Create new database
3. Add `DATABASE_URL` to Replit Secrets
4. Database schema auto-migrates on startup

## 🚀 Deployment Process

### Development Mode
```bash
npm run dev  # Starts both frontend and backend
```

### Production Deployment
1. Click "Deploy" button in Replit
2. Choose deployment tier (Reserved VM recommended)
3. Configure:
   ```
   Build command: npm run build
   Run command: npm run start
   ```

## 📊 Features Enabled

- ✅ **AI Code Generation** - Local AI agent for code generation
- ✅ **File Management** - Complete file system operations
- ✅ **Live Preview** - Real-time application preview
- ✅ **Database Integration** - PostgreSQL with Drizzle ORM
- ✅ **Authentication** - Replit Auth integration (optional)
- ✅ **TypeScript** - Full TypeScript support
- ✅ **Hot Reload** - Development with hot module replacement

## 🔌 API Endpoints

The server exposes these endpoints:

```
GET  /health                    # Health check
GET  /api/projects             # List projects
POST /api/projects             # Create project
GET  /api/projects/:id/export  # Export project
POST /api/ask                  # AI chat endpoint
GET  /api/auth/user           # User authentication
```

## 🛡️ Security Features

- CORS configuration for cross-origin requests
- Rate limiting on API endpoints
- Input sanitization and validation
- Secure session management
- SQL injection prevention with Drizzle ORM

## 🎯 Performance Optimizations

- **Frontend**: Vite build with code splitting
- **Backend**: Express with compression middleware
- **Database**: Connection pooling and query optimization
- **Caching**: Response caching for static assets
- **Bundling**: Optimized production builds

## 🔍 Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clear node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Database Connection**
   ```bash
   # Check database URL in secrets
   echo $DATABASE_URL
   ```

3. **Port Issues**
   ```bash
   # Ensure server binds to 0.0.0.0
   # Already configured in server/index.ts
   ```

### Debug Commands
```bash
# Check Node version
node --version  # Should be v20.x

# Check dependencies
npm list

# View logs
npm run dev 2>&1 | tee debug.log
```

## 📈 Monitoring

Access built-in monitoring:
- **Console**: Real-time logs in Replit console
- **Analytics**: `/api/analytics` endpoint (requires auth)
- **Health Check**: `/health` endpoint
- **Database**: Replit Database tab

## 🔄 Updates and Maintenance

### Updating from GitHub
1. Use Replit's Git integration
2. Pull latest changes: `git pull origin main`
3. Restart application: Use "Stop" then "Run" button

### Database Migrations
```bash
# Run migrations
npm run db:push
```

## 📞 Support

For issues specific to this deployment:

1. **Replit Issues**: Check [Replit Community](https://replit.com/community)
2. **Application Issues**: Check console logs and error messages
3. **Database Issues**: Verify connection and credentials

## 🏷️ Version Information

- **Node.js**: 20.x
- **React**: 18.x
- **TypeScript**: 5.x
- **Vite**: 6.x
- **Express**: 4.x
- **PostgreSQL**: 16.x

---

**Ready to deploy?** Just import from GitHub and click Run! 🚀
