import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerChatRoutes } from "./chat-routes";
import { registerEnhancedChatRoutes } from "./enhanced-chat-routes";
import { setupVite, serveStatic, log } from "./vite";
import { getPreview } from "./preview-store";
// VIRAAJDATA controller for authentication
import { viraajAuth } from "./viraaj-auth";
// Simple file-based authentication (no PostgreSQL dependency)
import fs from 'fs';
import path from 'path';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const app = express();

// Enable trust proxy for deployment environments
app.set('trust proxy', 1);

// Auto-generate essential Replit project files on startup (only for AI-generated projects)
function generateEssentialFiles() {
  const projectRoot = process.cwd();
  
  // Skip auto-generation if we already have an organized structure
  const hasOrganizedStructure = fs.existsSync(path.join(projectRoot, 'server')) && 
                                fs.existsSync(path.join(projectRoot, 'client')) &&
                                fs.existsSync(path.join(projectRoot, 'shared'));
  
  if (hasOrganizedStructure) {
    console.log('✅ Organized project structure detected, skipping auto-generation');
    return;
  }

  // Only generate files for AI projects in the ai-generated directory
  const aiGenDir = path.join(projectRoot, 'ai-generated');
  if (!fs.existsSync(aiGenDir)) {
    console.log('📁 Creating AI-generated projects directory...');
    fs.mkdirSync(aiGenDir, { recursive: true });
  }

  console.log('✅ AI project structure ready');
}

// Check project structure on startup
console.log('🔄 Checking project structure...');
generateEssentialFiles();

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Professional file creation endpoint for AI-generated projects
app.post('/api/files/create', async (req, res) => {
  try {
    const { fileName, content, language, projectId } = req.body;

    if (!fileName || content === undefined) {
      return res.status(400).json({ error: 'fileName and content are required' });
    }

    // Create project-specific directory structure
    const projectDir = path.join(process.cwd(), 'ai-generated', projectId || 'default-project');
    
    // Organize files into proper structure
    let targetPath = fileName;
    
    // Organize TypeScript/JavaScript files
    if (fileName.endsWith('.ts') && !fileName.includes('/')) {
      if (fileName === 'index.ts' || fileName.includes('server')) {
        targetPath = `server/${fileName}`;
      } else if (fileName.includes('component') || fileName.endsWith('.tsx')) {
        targetPath = `client/src/components/${fileName}`;
      } else {
        targetPath = `src/${fileName}`;
      }
    }
    
    // Organize other files
    if (fileName === 'package.json') targetPath = 'package.json';
    if (fileName === 'tsconfig.json') targetPath = 'tsconfig.json';
    if (fileName === 'vite.config.ts') targetPath = 'vite.config.ts';
    if (fileName.endsWith('.html')) targetPath = fileName;
    if (fileName.endsWith('.css')) targetPath = `src/styles/${fileName}`;
    
    const fullFilePath = path.join(projectDir, targetPath);
    const dir = path.dirname(fullFilePath);
    
    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write the file
    fs.writeFileSync(fullFilePath, content, 'utf8');

    console.log(`📄 AI Generated file: ${targetPath} in project ${projectId}`);
    res.json({ success: true, fileName: targetPath, path: fullFilePath, projectId });
  } catch (error) {
    console.error('Error creating AI file:', error);
    res.status(500).json({ error: 'Failed to create file' });
  }
});

// Preview endpoint for ai-generated files
app.get('/preview/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(process.cwd(), 'ai-generated', filename);
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      res.setHeader('Content-Type', 'text/html');
      res.send(content);
    } else {
      res.status(404).send('File not found');
    }
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).send('Preview error');
  }
});

// Professional file listing endpoint - starts with zero files
app.get('/api/files/list', async (req, res) => {
  try {
    // Start with completely empty project - professional clean slate
    const files: any = {};
    
    // Only scan for AI-generated files, ignore all system files
    const projectDir = path.join(process.cwd(), 'ai-generated');
    
    if (fs.existsSync(projectDir)) {
      const scanDirectory = (dir: string, relativePath = '') => {
        const items = fs.readdirSync(dir);

        for (const item of items) {
          // Only include AI-generated files
          if (item.startsWith('.')) continue;

          const fullPath = path.join(dir, item);
          const relativeFilePath = relativePath ? path.join(relativePath, item) : item;
          const stat = fs.statSync(fullPath);

          if (stat.isFile()) {
            try {
              const content = fs.readFileSync(fullPath, 'utf8');
              const ext = path.extname(item).toLowerCase();
              let type = 'text';

              if (ext === '.html') type = 'html';
              else if (ext === '.css') type = 'css';
              else if (ext === '.js' || ext === '.jsx') type = 'javascript';
              else if (ext === '.ts' || ext === '.tsx') type = 'typescript';
              else if (ext === '.py') type = 'python';
              else if (ext === '.json') type = 'json';

              files[relativeFilePath] = { content, type };
            } catch (error) {
              // Skip files that can't be read
            }
          } else if (stat.isDirectory()) {
            scanDirectory(fullPath, relativeFilePath);
          }
        }
      };

      scanDirectory(projectDir);
    }
    
    res.json({ files });
  } catch (error) {
    console.error('Error listing files:', error);
    res.json({ files: {} }); // Always return empty object for clean start
  }
});

(async () => {
  // Simple file-based system, no external database needed
  console.log('🚀 File-based authentication system active');
  
  // Handle preview API route FIRST before any other routes
  app.get('/api/preview-files/:projectId', (req, res) => {
    const { projectId } = req.params;
    const files = getPreview(projectId);
    
    console.log(`[PREVIEW] Direct handler for ${projectId}, files found: ${!!files}`);
    
    if (!files) {
      return res.status(404).send('Project not found');
    }
    
    if (files['index.html']) {
      res.setHeader('Content-Type', 'text/html');
      res.send(files['index.html'].content);
    } else {
      const firstHtml = Object.keys(files).find(name => name.endsWith('.html'));
      if (firstHtml) {
        res.setHeader('Content-Type', 'text/html');
        res.send(files[firstHtml].content);
      } else {
        res.json({ error: 'No HTML file found', availableFiles: Object.keys(files) });
      }
    }
  });

  // Initialize VIRAAJDATA authentication system
  await viraajAuth.initialize(app);
  console.log('✅ VIRAAJDATA authentication system initialized');
  
  // Register API routes BEFORE any other middleware to ensure they work
  registerChatRoutes(app);
  registerEnhancedChatRoutes(app);
  
  // Add explicit API route protection
  app.use('/api/*', (req, res, next) => {
    // Ensure API routes are not intercepted by frontend
    next();
  });
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error('Server error:', err);
    res.status(status).json({ message });
  });

  // Setup Vite in development, serve static in production
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // FIXED: Use port 5000 to match workflow expectations
  const port = parseInt(process.env.PORT || '5000', 10);
  
  // Increase max listeners to prevent warnings
  server.setMaxListeners(20);
  
  server.listen(port, '0.0.0.0', () => {
    log(`🚀 Server running on http://0.0.0.0:${port}`);
    log(`📱 App preview: https://${process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS || 'localhost:5000'}`);
  }).on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} is already in use. Please stop other processes first.`);
      process.exit(1);
    } else {
      console.error('❌ Server error:', err);
      process.exit(1);
    }
  });
})();
