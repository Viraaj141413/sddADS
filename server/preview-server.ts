import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

interface PreviewFile {
  name: string;
  content: string;
  language: string;
}

interface PreviewProject {
  id: string;
  files: Record<string, PreviewFile>;
  port?: number;
  server?: any;
}

class PreviewManager {
  private projects: Map<string, PreviewProject> = new Map();
  private basePort = 4000;
  private maxPorts = 100;

  async createPreview(projectId: string, files: Record<string, { content: string; language: string }>): Promise<{ url: string; port: number }> {
    // Convert files to preview format
    const previewFiles: Record<string, PreviewFile> = {};
    for (const [name, file] of Object.entries(files)) {
      previewFiles[name] = {
        name,
        content: file.content,
        language: file.language
      };
    }

    // Create project directory
    const projectDir = path.join(process.cwd(), 'preview-files', projectId);
    await this.ensureDir(projectDir);

    // Write files to disk
    for (const [filename, file] of Object.entries(previewFiles)) {
      const filePath = path.join(projectDir, filename);
      await fs.writeFile(filePath, file.content, 'utf-8');
    }

    // Find available port
    const port = await this.findAvailablePort();
    
    // Create express server for this project
    const app = express();
    app.use(express.static(projectDir));
    
    // Serve index.html by default
    app.get('/', (req, res) => {
      const indexPath = path.join(projectDir, 'index.html');
      if (existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        // Generate a simple directory listing
        const fileList = Object.keys(previewFiles).map(name => 
          `<li><a href="/${name}">${name}</a></li>`
        ).join('');
        
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Preview - ${projectId}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              h1 { color: #333; }
              ul { list-style: none; padding: 0; }
              li { margin: 10px 0; }
              a { color: #007bff; text-decoration: none; }
              a:hover { text-decoration: underline; }
            </style>
          </head>
          <body>
            <h1>Generated Files</h1>
            <ul>${fileList}</ul>
          </body>
          </html>
        `);
      }
    });

    // Start server
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`📱 Preview server for ${projectId} running on port ${port}`);
    });

    // Store project info
    const project: PreviewProject = {
      id: projectId,
      files: previewFiles,
      port,
      server
    };
    this.projects.set(projectId, project);

    // Always use localhost for preview
    const baseUrl = `http://localhost:${port}`;
    
    return {
      url: baseUrl,
      port
    };
  }

  async updatePreview(projectId: string, files: Record<string, { content: string; language: string }>): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const projectDir = path.join(process.cwd(), 'preview-files', projectId);
    
    // Update files
    for (const [filename, file] of Object.entries(files)) {
      const filePath = path.join(projectDir, filename);
      await fs.writeFile(filePath, file.content, 'utf-8');
      
      project.files[filename] = {
        name: filename,
        content: file.content,
        language: file.language
      };
    }
  }

  async stopPreview(projectId: string): Promise<void> {
    const project = this.projects.get(projectId);
    if (project && project.server) {
      project.server.close();
      this.projects.delete(projectId);
      console.log(`🛑 Preview server for ${projectId} stopped`);
    }
  }

  private async findAvailablePort(): Promise<number> {
    for (let i = 0; i < this.maxPorts; i++) {
      const port = this.basePort + i;
      if (await this.isPortAvailable(port)) {
        return port;
      }
    }
    throw new Error('No available ports for preview server');
  }

  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise(async (resolve) => {
      try {
        const net = await import('net');
        const server = net.createServer();
        server.listen(port, () => {
          server.close(() => resolve(true));
        });
        server.on('error', () => resolve(false));
      } catch {
        resolve(false);
      }
    });
  }

  private async ensureDir(dir: string): Promise<void> {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }
}

export const previewManager = new PreviewManager();