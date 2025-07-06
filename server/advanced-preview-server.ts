import express from 'express';
import path from 'path';
import fs from 'fs';
import { nanoid } from 'nanoid';
import { createServer } from 'net';

interface PreviewServer {
  id: string;
  port: number;
  server: any;
  projectPath: string;
}

class AdvancedPreviewManager {
  private servers: Map<string, PreviewServer> = new Map();
  private basePort = 5000;
  private maxServers = 10;

  async createPreviewServer(projectId: string, files: Record<string, any>): Promise<{ port: number; url: string; serverId: string }> {
    // Clean up old servers if we hit the limit
    if (this.servers.size >= this.maxServers) {
      const oldestServerId = this.servers.keys().next().value;
      if (oldestServerId) {
        await this.stopPreviewServer(oldestServerId);
      }
    }

    const serverId = `preview_${projectId}_${nanoid(8)}`;
    const port = await this.findAvailablePort();
    const projectPath = path.join(process.cwd(), 'preview-projects', serverId);

    // Create project directory
    await fs.promises.mkdir(projectPath, { recursive: true });

    // Write all files to the project directory
    for (const [filePath, fileData] of Object.entries(files)) {
      const fullPath = path.join(projectPath, filePath);
      const dir = path.dirname(fullPath);
      
      // Ensure directory exists
      await fs.promises.mkdir(dir, { recursive: true });
      
      // Write file content
      const content = typeof fileData === 'string' ? fileData : fileData.content;
      await fs.promises.writeFile(fullPath, content, 'utf8');
    }

    // Create Express server for this project
    const app = express();
    
    // Advanced CORS and security headers
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      res.header('X-Frame-Options', 'SAMEORIGIN');
      res.header('X-Content-Type-Options', 'nosniff');
      next();
    });

    // Serve static files
    app.use(express.static(projectPath));

    // Handle API routes for dynamic apps
    app.use('/api/*', (req, res) => {
      res.json({ 
        message: 'API endpoint placeholder - implement your backend logic here',
        method: req.method,
        path: req.path,
        body: req.body 
      });
    });

    // Handle SPA routing
    app.get('*', (req, res) => {
      const indexPath = path.join(projectPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        // Generate a default index if none exists
        const defaultHtml = this.generateDefaultIndex(files);
        res.send(defaultHtml);
      }
    });

    // Start the server
    const server = await this.startServer(app, port);
    
    const previewServer: PreviewServer = {
      id: serverId,
      port,
      server,
      projectPath
    };

    this.servers.set(serverId, previewServer);

    const url = `http://localhost:${port}`;
    console.log(`🚀 Preview server started: ${url} (ID: ${serverId})`);

    return { port, url, serverId };
  }

  private async findAvailablePort(): Promise<number> {
    let port = this.basePort;
    const maxAttempts = 100;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (await this.isPortAvailable(port)) {
        return port;
      }
      port++;
    }
    
    throw new Error('No available ports found');
  }

  private isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = createServer();
      server.listen(port, '0.0.0.0', () => {
        server.once('close', () => resolve(true));
        server.close();
      });
      server.on('error', () => resolve(false));
    });
  }

  private startServer(app: express.Application, port: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const server = app.listen(port, '0.0.0.0', () => {
        resolve(server);
      });
      server.on('error', reject);
    });
  }

  private generateDefaultIndex(files: Record<string, any>): string {
    const hasHtml = Object.keys(files).some(f => f.endsWith('.html'));
    if (hasHtml) return '<html><body><h1>Project Files</h1></body></html>';

    // Generate file browser
    const filesList = Object.keys(files).map(fileName => {
      const isText = this.isTextFile(fileName);
      return `<li><a href="/${fileName}" ${isText ? '' : 'download'}>${fileName}</a></li>`;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Project Preview</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; }
        .header { border-bottom: 1px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
        .files { list-style: none; padding: 0; }
        .files li { padding: 8px 0; border-bottom: 1px solid #f5f5f5; }
        .files li:last-child { border-bottom: none; }
        .files a { text-decoration: none; color: #007acc; }
        .files a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Project Preview</h1>
        <p>Your generated project files are ready!</p>
    </div>
    <ul class="files">${filesList}</ul>
</body>
</html>`;
  }

  private isTextFile(fileName: string): boolean {
    const textExtensions = ['.html', '.css', '.js', '.ts', '.jsx', '.tsx', '.json', '.md', '.txt', '.py', '.php'];
    return textExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  }

  async stopPreviewServer(serverId: string): Promise<void> {
    const previewServer = this.servers.get(serverId);
    if (!previewServer) return;

    // Close the server
    if (previewServer.server) {
      previewServer.server.close();
    }

    // Clean up project files
    try {
      await fs.promises.rm(previewServer.projectPath, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to cleanup project files: ${error}`);
    }

    this.servers.delete(serverId);
    console.log(`🛑 Preview server stopped: ${serverId}`);
  }

  async stopAllServers(): Promise<void> {
    const promises = Array.from(this.servers.keys()).map(id => this.stopPreviewServer(id));
    await Promise.all(promises);
  }

  getActiveServers(): Array<{ id: string; port: number; url: string }> {
    return Array.from(this.servers.values()).map(server => ({
      id: server.id,
      port: server.port,
      url: `http://localhost:${server.port}`
    }));
  }

  async updatePreviewFiles(serverId: string, files: Record<string, any>): Promise<void> {
    const previewServer = this.servers.get(serverId);
    if (!previewServer) throw new Error('Preview server not found');

    // Update files in the project directory
    for (const [filePath, fileData] of Object.entries(files)) {
      const fullPath = path.join(previewServer.projectPath, filePath);
      const dir = path.dirname(fullPath);
      
      await fs.promises.mkdir(dir, { recursive: true });
      
      const content = typeof fileData === 'string' ? fileData : fileData.content;
      await fs.promises.writeFile(fullPath, content, 'utf8');
    }

    console.log(`📝 Updated files for preview server: ${serverId}`);
  }
}

export const previewManager = new AdvancedPreviewManager();

// Cleanup on process exit
process.on('SIGINT', async () => {
  await previewManager.stopAllServers();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await previewManager.stopAllServers();
  process.exit(0);
});