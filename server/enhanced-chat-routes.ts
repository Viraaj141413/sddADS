import { Express, Request, Response } from 'express';
import { geminiChat, ChatRequest } from './gemini-chat';
import { createProjectFileService } from './file-service';
import { viraajAuth } from './viraaj-auth';
import { nanoid } from 'nanoid';

// Store active chat sessions
const activeSessions = new Map<string, {
  projectId: string;
  userId: string;
  conversationHistory: any[];
  lastActivity: Date;
}>();

export function registerEnhancedChatRoutes(app: Express) {

  // Main Gemini-powered chat endpoint with file tools
  app.post('/api/gemini/chat', async (req: Request, res: Response) => {
    try {
      const { message, projectId, sessionId } = req.body;
      const userId = (req.session as any)?.userId;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Create or get session
      const currentSessionId = sessionId || nanoid();
      const currentProjectId = projectId || nanoid();

      let session = activeSessions.get(currentSessionId);
      if (!session) {
        session = {
          projectId: currentProjectId,
          userId: userId || 'anonymous',
          conversationHistory: [],
          lastActivity: new Date()
        };
        activeSessions.set(currentSessionId, session);
      }

      // Build chat request
      const chatRequest: ChatRequest = {
        message,
        projectId: session.projectId,
        conversationHistory: session.conversationHistory,
        userId: session.userId
      };

      // Check if Gemini is configured
      if (!geminiChat.isReady()) {
        return res.status(503).json({
          error: "Gemini API not configured",
          suggestion: "Please provide GEMINI_API_KEY environment variable"
        });
      }

      // Generate response with Gemini
      const response = await geminiChat.generateResponse(chatRequest);

      if (response.success) {
        // Update conversation history
        session.conversationHistory.push({
          role: 'user',
          content: message
        });

        if (response.message) {
          session.conversationHistory.push({
            role: 'assistant',
            content: response.message
          });
        }

        session.lastActivity = new Date();

        res.json({
          success: true,
          message: response.message,
          projectId: response.projectId,
          sessionId: currentSessionId,
          toolResults: response.toolResults,
          hasFiles: response.toolResults && response.toolResults.length > 0
        });
      } else {
        res.status(500).json({
          error: response.error || 'Chat generation failed'
        });
      }

    } catch (error) {
      console.error('Chat route error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Streaming chat endpoint for real-time progress updates
  app.post('/api/gemini/chat-stream', async (req: Request, res: Response) => {
    try {
      const { message, projectId, sessionId } = req.body;
      const userId = (req.session as any)?.userId;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Set up Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Create or get session
      const currentSessionId = sessionId || nanoid();
      const currentProjectId = projectId || nanoid();

      let session = activeSessions.get(currentSessionId);
      if (!session) {
        session = {
          projectId: currentProjectId,
          userId: userId || 'anonymous',
          conversationHistory: [],
          lastActivity: new Date()
        };
        activeSessions.set(currentSessionId, session);
      }

      // Build chat request
      const chatRequest: ChatRequest = {
        message,
        projectId: session.projectId,
        conversationHistory: session.conversationHistory,
        userId: session.userId
      };

      // Progress callback for streaming updates
      const onProgress = (update: string) => {
        res.write(`data: ${JSON.stringify({ type: 'progress', message: update })}\n\n`);
      };

      // Check if Gemini is configured
      if (!geminiChat.isReady()) {
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          message: 'Gemini API not configured. Please provide GEMINI_API_KEY.' 
        })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }

      // Generate response with streaming
      const response = await geminiChat.streamResponse(chatRequest, onProgress);

      if (response.success) {
        // Update conversation history
        session.conversationHistory.push({
          role: 'user',
          content: message
        });

        if (response.message) {
          session.conversationHistory.push({
            role: 'assistant',
            content: response.message
          });
        }

        session.lastActivity = new Date();

        // Send final response
        res.write(`data: ${JSON.stringify({
          type: 'response',
          message: response.message,
          projectId: response.projectId,
          sessionId: currentSessionId,
          toolResults: response.toolResults,
          hasFiles: response.toolResults && response.toolResults.length > 0
        })}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          message: response.error || 'Chat generation failed' 
        })}\n\n`);
      }

      res.write('data: [DONE]\n\n');
      res.end();

    } catch (error) {
      console.error('Streaming chat route error:', error);
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        message: 'Internal server error' 
      })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  });

  // Get project files
  app.get('/api/projects/:projectId/files', async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const fileService = createProjectFileService(projectId);

      const manifest = await fileService.getProjectManifest();

      res.json({
        success: true,
        files: manifest,
        projectId
      });
    } catch (error) {
      console.error('Get files error:', error);
      res.status(500).json({ error: 'Failed to get project files' });
    }
  });

  // Get specific file content
  app.get('/api/projects/:projectId/files/*', async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const filePath = req.params[0]; // Everything after /files/
      const fileService = createProjectFileService(projectId);

      const result = await fileService.readFile(filePath);

      if (result.status === 'success') {
        res.json({
          success: true,
          content: result.data?.content,
          path: filePath,
          type: result.data?.type || 'text'
        });
      } else {
        res.status(404).json({
          error: result.message
        });
      }
    } catch (error) {
      console.error('Get file error:', error);
      res.status(500).json({ error: 'Failed to get file' });
    }
  });

  // Preview project (serve files)
  app.get('/api/projects/:projectId/preview', async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const fileService = createProjectFileService(projectId);

      // Try to serve index.html first
      const indexResult = await fileService.readFile('index.html');

      if (indexResult.status === 'success') {
        res.setHeader('Content-Type', 'text/html');
        res.send(indexResult.data?.content);
      } else {
        // Generate a simple file listing page
        const manifest = await fileService.getProjectManifest();
        const fileList = Object.keys(manifest);

        const listingHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Project Files - ${projectId}</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .file { margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
        .file-name { font-weight: bold; color: #333; }
        .file-content { margin-top: 10px; background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
        pre { margin: 0; }
    </style>
</head>
<body>
    <h1>Project Files</h1>
    <p>Project ID: ${projectId}</p>
    ${fileList.length === 0 ? '<p>No files in this project yet.</p>' : 
      fileList.map(fileName => `
        <div class="file">
          <div class="file-name">${fileName}</div>
          <div class="file-content">
            <pre><code>${manifest[fileName].content || ''}</code></pre>
          </div>
        </div>
      `).join('')
    }
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        res.send(listingHTML);
      }
    } catch (error) {
      console.error('Preview error:', error);
      res.status(500).send('Preview error');
    }
  });

  // Clean up old sessions (run periodically)
  setInterval(() => {
    const now = new Date();
    const maxAge = 60 * 60 * 1000; // 1 hour

    for (const [sessionId, session] of activeSessions.entries()) {
      if (now.getTime() - session.lastActivity.getTime() > maxAge) {
        activeSessions.delete(sessionId);
      }
    }
  }, 30 * 60 * 1000); // Check every 30 minutes

  // Debug endpoint to check Gemini status
  app.get('/api/gemini/status', (req: Request, res: Response) => {
    res.json({
      configured: geminiChat.isReady(),
      hasApiKey: !!process.env.GEMINI_API_KEY,
      timestamp: new Date().toISOString()
    });
  });

  app.post('/api/enhanced-chat', async (req, res) => {
    try {
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({
          success: false,
          error: 'Message is required'
        });
      }

      if (!geminiChat.isReady()) {
        return res.status(503).json({
          success: false,
          error: 'Gemini API not configured. Please provide GEMINI_API_KEY environment variable.'
        });
      }

      const chatRequest = {
        message,
        projectId: req.body.projectId,
        conversationHistory: req.body.conversationHistory || [],
        userId: (req.session as any)?.userId
      };

      // Execute Gemini chat
      const response = await geminiChat.generateResponse(chatRequest);

      // Update session with conversation
      session.conversationHistory.push(
        { role: 'user', content: message },
        { role: 'assistant', content: response.message || '' }
      );
      session.lastActivity = new Date();

      if (response.success) {
        // Check if files were created and provide additional info
        const hasFiles = response.toolResults && response.toolResults.some(r => r.status === 'success');

        res.json({
          success: true,
          response: response.message,
          projectId: response.projectId,
          toolResults: response.toolResults,
          filesGenerated: hasFiles,
          sessionId: currentSessionId,
          previewUrl: hasFiles ? `/api/preview-files/${response.projectId}` : undefined
        });
      } else {
        res.status(500).json({
          success: false,
          error: response.error || 'Gemini API request failed'
        });
      }
    } catch (error) {
      console.error('Enhanced chat error:', error);
      res.status(500).json({
        success: false,
        error: `API Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      });
    }
  });

}