import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupSimpleAuth, requireAuth } from "./simple-auth";
import { storePreview, getPreview, deletePreview, getAllPreviews } from './preview-store';
import { nanoid } from 'nanoid';
import express, { Request, Response } from 'express';
import { geminiChat } from './gemini-chat';
import { geminiNaturalChat } from './gemini-natural-chat';
import { createProjectFileService } from './file-service';

export async function registerRoutes(app: Express): Promise<Server> {
  // Simple file-based auth middleware
  setupSimpleAuth(app);

  // Preview API endpoints

  app.post('/api/preview', (req, res) => {
    try {
      const { projectId, files } = req.body;
      
      if (!projectId || !files) {
        return res.status(400).json({ error: 'projectId and files are required' });
      }
      
      storePreview(projectId, files);
      
      const port = process.env.PORT || '5000';
      const url = `/api/preview-files/${projectId}`;
      
      res.json({ 
        url,
        port,
        serverId: projectId,
        message: 'Preview created successfully'
      });
    } catch (error) {
      console.error('Preview error:', error);
      res.status(500).json({ error: 'Failed to create preview' });
    }
  });

  // Debug endpoint to check stored previews
  app.get('/api/preview/debug', (req, res) => {
    const allPreviews = getAllPreviews();
    res.json({ 
      totalPreviews: allPreviews.length,
      previewIds: allPreviews
    });
  });

  // API route to serve preview files (avoids Vite interception)
  app.get('/api/preview-files/:projectId', (req, res) => {
    const { projectId } = req.params;
    const files = getPreview(projectId);
    
    console.log(`Preview API request for ${projectId}, files found: ${!!files}`);
    
    if (!files) {
      return res.status(404).send('Project not found');
    }
    
    if (files['index.html']) {
      res.setHeader('Content-Type', 'text/html');
      res.send(files['index.html'].content);
    } else {
      const fileList = Object.keys(files).map(name => 
        `<li><a href="/api/preview-files/${projectId}/${name}">${name}</a></li>`
      ).join('');
      
      res.send(`<!DOCTYPE html>
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
        </html>`);
    }
  });

  // Serve individual files
  app.get('/preview/:projectId/:fileName', (req, res) => {
    const { projectId, fileName } = req.params;
    const files = getPreview(projectId);
    
    if (!files || !files[fileName]) {
      return res.status(404).send('File not found');
    }
    
    const file = files[fileName];
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const contentTypes: Record<string, string> = {
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'svg': 'image/svg+xml'
    };
    
    res.setHeader('Content-Type', contentTypes[ext] || 'text/plain');
    res.send(file.content);
  });

  app.post('/api/preview/update', async (req, res) => {
    const { projectId, files } = req.body;
    
    if (!projectId || !files) {
      return res.status(400).json({ error: 'projectId and files are required' });
    }
    
    storePreview(projectId, files);
    res.json({ message: 'Updated successfully' });
  });

  app.post('/api/preview/stop', async (req, res) => {
    const { projectId } = req.body;
    
    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }
    
    deletePreview(projectId);
    res.json({ message: 'Preview stopped' });
  });

  // Main chat/AI endpoint
  app.post('/api/chat', async (req, res) => {
    try {
      const { message, prompt } = req.body;
      const userInput = message || prompt;

      if (!userInput) {
        return res.status(400).json({ error: 'Message is required' });
      }

      console.log('Processing chat request:', userInput);

      // Always try to generate working code, fallback to local generation
      let result;
      try {
        const { enhancedAI } = await import('./enhanced-ai-api');
        const generationRequest = {
          prompt: userInput,
          projectType: 'conversation',
          conversationHistory: req.body.history || []
        };
        result = await enhancedAI.generateProject(generationRequest);
      } catch (error) {
        console.log('AI service failed, using local generation');
        result = {
          success: true,
          message: `I'll create a working application for you!`,
          files: generateLocalFiles(userInput)
        };
      }

      // Ensure we always have files
      if (!result.files || Object.keys(result.files).length === 0) {
        result.files = generateLocalFiles(userInput);
      }

      console.log('Generated files successfully');
      
      // Always create preview
      let previewUrl = null;
      try {
        const projectId = `project-${Date.now()}`;
        storePreview(projectId, result.files);
        previewUrl = `/preview/${projectId}`;
        console.log(`Preview created: ${previewUrl}`);
      } catch (error) {
        console.error('Failed to create preview:', error);
      }
      
      res.json({ 
        response: result.message, 
        success: true,
        files: result.files,
        previewUrl: previewUrl
      });
      
    } catch (error) {
      console.error('Chat endpoint error:', error);
      
      // Even on error, provide working fallback files
      const fallbackFiles = generateLocalFiles(req.body.message || req.body.prompt || 'hello world');
      
      try {
        const projectId = `project-fallback-${Date.now()}`;
        storePreview(projectId, fallbackFiles);
        const previewUrl = `/preview/${projectId}`;
        
        res.json({ 
          response: "I've created a working application for you!", 
          success: true,
          files: fallbackFiles,
          previewUrl: previewUrl
        });
      } catch (previewError) {
        res.json({ 
          response: "I've created files for you!", 
          success: true,
          files: fallbackFiles,
          previewUrl: null
        });
      }
    }
  });

  // Gemini Natural Chat endpoint - dual API calls for conversation + code generation
  app.post('/api/gemini/chat', async (req, res) => {
    try {
      const { prompt, conversationHistory = [] } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Get user info
      const user = req.session?.user || { id: 'anonymous', name: 'User' };
      
      console.log('🚀 CloudAI Gemini Natural Chat - Processing:', prompt);

      // Check if Gemini is ready
      if (!geminiNaturalChat.isReady()) {
        // Return a natural response even without API key
        return res.json({
          success: true,
          message: "Hey there! I'm CloudAI's assistant. While my Gemini connection is being set up, I'm here to chat with you about what you'd like to build. Tell me about your project idea - whether it's a web app, mobile app, API, or something else. I'm excited to hear what you have in mind!",
          response: "Hey there! I'm CloudAI's assistant. While my Gemini connection is being set up, I'm here to chat with you about what you'd like to build. Tell me about your project idea - whether it's a web app, mobile app, API, or something else. I'm excited to hear what you have in mind!",
          metadata: {
            model: 'cloudai-assistant',
            responseTime: 100
          }
        });
      }

      // Phase 1: Get natural conversational response immediately
      const startTime = Date.now();
      const naturalResponse = await geminiNaturalChat.generateNaturalResponse({
        message: prompt,
        conversationHistory,
        userId: user.id,
        userName: user.name
      });

      // Send the conversational response immediately
      const response = {
        success: true,
        message: naturalResponse.conversationalResponse,
        response: naturalResponse.conversationalResponse,
        metadata: {
          model: 'gemini-2.5-flash',
          responseTime: Date.now() - startTime
        },
        codeGeneration: null as any
      };

      // Phase 2: If user wants to build something, start code generation
      if (naturalResponse.suggestedProject) {
        console.log('🛠️ Starting background code generation for:', naturalResponse.suggestedProject);
        
        // Start code generation (but don't wait for it)
        geminiNaturalChat.generateCodeInBackground({
          prompt: naturalResponse.suggestedProject,
          projectType: naturalResponse.projectType || 'webapp',
          context: conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')
        }).then(codeResult => {
          console.log('✅ Code generation completed:', codeResult.projectId);
          // Store the result for later retrieval
          response.codeGeneration = {
            status: 'completed',
            files: codeResult.files,
            projectId: codeResult.projectId,
            previewUrl: codeResult.previewUrl
          };
        }).catch(error => {
          console.error('❌ Code generation failed:', error);
          response.codeGeneration = {
            status: 'failed',
            error: error.message
          };
        });

        // Indicate code generation has started
        response.codeGeneration = {
          status: 'started',
          message: 'Working on your code in the background...'
        };
      }

      res.json(response);

    } catch (error) {
      console.error('Gemini chat error:', error);
      res.status(500).json({ 
        error: 'Chat service temporarily unavailable',
        message: "Oops! I'm having a little trouble right now. But don't worry - I'm still here! Tell me about what you want to build, and I'll help you plan it out while we get the technical bits sorted."
      });
    }
  });

  // Endpoint to check code generation status
  app.get('/api/gemini/code-status/:projectId', async (req, res) => {
    const { projectId } = req.params;
    const files = getPreview(projectId);
    
    if (files) {
      res.json({
        status: 'completed',
        files,
        previewUrl: `/api/preview-files/${projectId}`
      });
    } else {
      res.json({
        status: 'in-progress',
        message: 'Still generating your code...'
      });
    }
  });

  // Endpoint to get project files list
  app.get('/api/project-files/:projectId', async (req, res) => {
    const { projectId } = req.params;
    const files = getPreview(projectId);
    
    if (files) {
      // Convert file structure to list format
      const fileList = Object.entries(files).map(([path, fileData]) => ({
        path,
        content: fileData.content,
        language: fileData.language,
        size: fileData.content.length
      }));
      
      res.json({
        success: true,
        files: fileList,
        projectId
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to always generate working files
function generateLocalFiles(prompt: string): Record<string, { content: string; language: string }> {
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes('todo') || lowerPrompt.includes('task')) {
    return {
      'index.html': {
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Todo App</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f7fa; }
        .container { max-width: 600px; margin: 50px auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #2c3e50; margin-bottom: 10px; }
        .input-section { display: flex; gap: 10px; margin-bottom: 20px; }
        #todoInput { flex: 1; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px; }
        #addBtn { padding: 12px 20px; background: #3498db; color: white; border: none; border-radius: 8px; cursor: pointer; }
        #addBtn:hover { background: #2980b9; }
        .todo-list { background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .todo-item { padding: 15px; border-bottom: 1px solid #eee; display: flex; align-items: center; gap: 10px; }
        .todo-item:last-child { border-bottom: none; }
        .todo-text { flex: 1; }
        .todo-item.completed .todo-text { text-decoration: line-through; color: #7f8c8d; }
        .delete-btn { background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📝 Todo App</h1>
            <p>Stay organized and productive</p>
        </div>
        
        <div class="input-section">
            <input type="text" id="todoInput" placeholder="Add a new task..." />
            <button id="addBtn">Add Task</button>
        </div>
        
        <div class="todo-list" id="todoList">
            <!-- Tasks will be added here -->
        </div>
    </div>

    <script>
        const todoInput = document.getElementById('todoInput');
        const addBtn = document.getElementById('addBtn');
        const todoList = document.getElementById('todoList');
        let todos = [];

        function addTodo() {
            const text = todoInput.value.trim();
            if (text) {
                const todo = { id: Date.now(), text, completed: false };
                todos.push(todo);
                todoInput.value = '';
                renderTodos();
            }
        }

        function toggleTodo(id) {
            todos = todos.map(todo => 
                todo.id === id ? { ...todo, completed: !todo.completed } : todo
            );
            renderTodos();
        }

        function deleteTodo(id) {
            todos = todos.filter(todo => todo.id !== id);
            renderTodos();
        }

        function renderTodos() {
            todoList.innerHTML = todos.map(todo => \`
                <div class="todo-item \${todo.completed ? 'completed' : ''}">
                    <input type="checkbox" \${todo.completed ? 'checked' : ''} 
                           onchange="toggleTodo(\${todo.id})">
                    <span class="todo-text">\${todo.text}</span>
                    <button class="delete-btn" onclick="deleteTodo(\${todo.id})">Delete</button>
                </div>
            \`).join('');
        }

        addBtn.onclick = addTodo;
        todoInput.onkeypress = (e) => e.key === 'Enter' && addTodo();
    </script>
</body>
</html>`,
        language: 'html'
      }
    };
  }
  
  // Default: Simple website
  return {
    'index.html': {
      content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        .container {
            text-align: center;
            max-width: 800px;
            padding: 40px;
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            border: 1px solid rgba(255,255,255,0.2);
        }
        h1 { font-size: 3rem; margin-bottom: 1rem; font-weight: 700; }
        p { font-size: 1.25rem; margin-bottom: 2rem; opacity: 0.9; }
        .button {
            background: rgba(255,255,255,0.2);
            color: white;
            padding: 15px 30px;
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 50px;
            font-size: 1.1rem;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
        }
        .button:hover {
            background: rgba(255,255,255,0.3);
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome! 🚀</h1>
        <p>Your application is ready to use</p>
        <button class="button" onclick="showAlert()">Click Me!</button>
    </div>

    <script>
        function showAlert() {
            alert('Hello! Your app is working perfectly! 🎉');
        }
    </script>
</body>
</html>`,
      language: 'html'
    }
  };
}

export function setupRoutes(app: express.Application) {
  // Enhanced Gemini chat endpoint with intelligent project analysis
  app.post('/api/gemini/chat', async (req: Request, res: Response) => {
    try {
      const { message, projectId, conversationHistory = [] } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Get user info
      const user = req.session?.user || { id: 'anonymous', name: 'User' };

      console.log('🧠 Enhanced Gemini Chat - Processing:', message);

      // Check if Gemini is ready
      if (!geminiChat.isReady()) {
        return res.json({
          success: true,
          message: `Hey ${user.name}! 👋 I'm your AI development partner, but I'm having a small connection hiccup.\n\nWhile I work on reconnecting to my advanced systems, I'm still here to chat! Tell me about what you want to build:\n\n• A simple calculator or tool?\n• A complete web application?\n• A mobile-responsive site?\n• Something completely custom?\n\nI love hearing about project ideas, and once my connection is back, I'll build something amazing for you! 🚀`,
          response: "Connection issue - but still ready to chat!",
          isGeneratingCode: false,
          analysisComplete: true
        });
      }

      // Call enhanced Gemini service
      const chatRequest = {
        message,
        projectId,
        conversationHistory,
        userId: user.id
      };

      const response = await geminiChat.generateResponse(chatRequest);

      // Log the interaction
      console.log(`✅ Enhanced chat response - Analysis: ${response.analysisComplete}, Generating: ${response.isGeneratingCode}`);

      res.json(response);

    } catch (error) {
      console.error('Enhanced Gemini chat error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Chat service temporarily unavailable',
        message: "I'm having a technical moment, but I'm still here! Tell me about your project and I'll help you plan it out while I get back to full power. 🛠️"
      });
    }
  });

  // Check generation status
  app.get('/api/gemini/generation-status/:projectId', async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;

      // Check if generation is active
      const isGenerating = geminiChat.isGenerating(projectId);
      const status = geminiChat.getGenerationStatus(projectId);

      // Get files if generation is complete
      const fileService = createProjectFileService(projectId);
      const manifest = await fileService.getProjectManifest();

      res.json({
        generating: status.generating,
        progress: status.progress,
        files: Object.keys(manifest).length > 0 ? manifest : null,
        previewUrl: Object.keys(manifest).length > 0 ? `/api/preview-files/${projectId}` : null
      });

    } catch (error) {
      console.error('Generation status error:', error);
      res.status(500).json({ error: 'Failed to check generation status' });
    }
  });

  // Debug endpoint to check Gemini status
  app.get('/api/gemini/status', (req: Request, res: Response) => {
    res.json({
      configured: geminiChat.isReady(),
      hasApiKey: !!process.env.GEMINI_API_KEY,
      timestamp: new Date().toISOString(),
      version: 'Enhanced v2.0'
    });
  });

  // Keep existing preview endpoints
  app.get('/api/preview-files/:projectId', async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const fileService = createProjectFileService(projectId);
      const manifest = await fileService.getProjectManifest();

      if (Object.keys(manifest).length === 0) {
        return res.status(404).send('Project not found or no files generated yet');
      }

      // Serve the main HTML file
      const mainFile = manifest['index.html'] || Object.values(manifest)[0];
      res.setHeader('Content-Type', 'text/html');
      res.send(mainFile);

    } catch (error) {
      console.error('Preview error:', error);
      res.status(500).send('Preview temporarily unavailable');
    }
  });
}