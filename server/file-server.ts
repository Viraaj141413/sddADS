
import express from 'express';
import path from 'path';
import fs from 'fs';

let fileServer: any = null;
let currentPort = 5000;

interface ProjectFile {
  content: string;
  language?: string;
}

interface Project {
  id: string;
  files: Record<string, ProjectFile>;
}

export function startFileServer(project: Project): Promise<number> {
  return new Promise((resolve, reject) => {
    // Stop existing server if running
    if (fileServer) {
      fileServer.close();
    }

    const app = express();
    
    // Enable CORS for preview
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      next();
    });

    // Create temp directory for project files
    const tempDir = path.join(process.cwd(), 'temp-projects', project.id);
    
    // Ensure directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Write all project files to temp directory
    Object.entries(project.files).forEach(([fileName, fileData]) => {
      const filePath = path.join(tempDir, fileName);
      const fileDir = path.dirname(filePath);
      
      // Ensure subdirectories exist
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, fileData.content);
    });

    // Serve static files
    app.use(express.static(tempDir));

    // Handle SPA routing - serve index.html for any route that doesn't match a file
    app.get('*', (req, res) => {
      const indexPath = path.join(tempDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('File not found');
      }
    });

    // Try to start server on port 5000, increment if busy
    const tryPort = (port: number) => {
      fileServer = app.listen(port, '0.0.0.0', () => {
        currentPort = port;
        console.log(`🚀 File server started on port ${port}`);
        resolve(port);
      }).on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          tryPort(port + 1);
        } else {
          reject(err);
        }
      });
    };

    tryPort(5000);
  });
}

export function stopFileServer() {
  if (fileServer) {
    fileServer.close();
    fileServer = null;
  }
}

export function getCurrentPort(): number {
  return currentPort;
}
