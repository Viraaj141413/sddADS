import { Express } from 'express';
import path from 'path';
import fs from 'fs/promises';

const previewProjects = new Map<string, Record<string, { content: string; language: string }>>();

export function setupSimplePreview(app: Express) {
  // Store project files in memory
  app.post('/api/preview/create', (req, res) => {
    const { projectId, files } = req.body;
    
    if (!projectId || !files) {
      return res.status(400).json({ error: 'projectId and files are required' });
    }
    
    previewProjects.set(projectId, files);
    
    res.json({ 
      success: true,
      url: `/preview/${projectId}`,
      message: 'Preview created successfully'
    });
  });

  // Serve preview files
  app.get('/preview/:projectId', (req, res) => {
    const { projectId } = req.params;
    const files = previewProjects.get(projectId);
    
    if (!files) {
      return res.status(404).send('Project not found');
    }
    
    // Serve index.html if it exists
    if (files['index.html']) {
      res.setHeader('Content-Type', 'text/html');
      res.send(files['index.html'].content);
    } else {
      // Generate file listing
      const fileList = Object.keys(files).map(name => 
        `<li><a href="/preview/${projectId}/${name}">${name}</a></li>`
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
          <h1>Project Files</h1>
          <ul>${fileList}</ul>
        </body>
        </html>
      `);
    }
  });

  // Serve individual files
  app.get('/preview/:projectId/:fileName', (req, res) => {
    const { projectId, fileName } = req.params;
    const files = previewProjects.get(projectId);
    
    if (!files || !files[fileName]) {
      return res.status(404).send('File not found');
    }
    
    const file = files[fileName];
    
    // Set content type based on file extension
    const ext = path.extname(fileName).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml'
    };
    
    const contentType = contentTypes[ext] || 'text/plain';
    res.setHeader('Content-Type', contentType);
    res.send(file.content);
  });

  // Update preview
  app.post('/api/preview/update', (req, res) => {
    const { projectId, files } = req.body;
    
    if (!projectId || !files) {
      return res.status(400).json({ error: 'projectId and files are required' });
    }
    
    previewProjects.set(projectId, files);
    res.json({ success: true, message: 'Preview updated' });
  });

  // Delete preview
  app.post('/api/preview/delete', (req, res) => {
    const { projectId } = req.body;
    
    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }
    
    previewProjects.delete(projectId);
    res.json({ success: true, message: 'Preview deleted' });
  });

  console.log('✅ Simple preview system initialized');
}