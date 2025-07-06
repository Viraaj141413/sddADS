import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { previewManager } from './advanced-preview-server.js';

interface AIGenerationRequest {
  prompt: string;
  projectType?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  userId?: string;
  deviceId?: string;
}

interface AIGenerationResponse {
  success: boolean;
  message: string;
  files?: Record<string, { content: string; language: string }>;
  previewUrl?: string;
  error?: string;
}

class EnhancedAIService {
  private openai: OpenAI | null = null;
  private gemini: GoogleGenAI | null = null;
  private isOpenAIConfigured = false;
  private isGeminiConfigured = false;

  constructor() {
    this.initializeAIServices();
  }

  private initializeAIServices() {
    // Initialize Gemini API first (priority)
    try {
      if (process.env.GEMINI_API_KEY) {
        this.gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        this.isGeminiConfigured = true;
        console.log('🚀 Gemini 2.5 Flash API initialized successfully');
      } else {
        console.warn('⚠️ GEMINI_API_KEY not found in environment variables');
      }
    } catch (error) {
      console.error('Failed to initialize Gemini API:', error);
    }

    // Initialize GPT-4.1 with GitHub token as backup
    try {
      if (process.env.GITHUB_TOKEN) {
        this.openai = new OpenAI({
          baseURL: "https://models.github.ai/inference",
          apiKey: process.env.GITHUB_TOKEN,
        });
        this.isOpenAIConfigured = true;
        console.log('🚀 GPT-4.1 API initialized as backup');
      }
    } catch (error) {
      console.error('Failed to initialize GitHub Models API:', error);
    }

    if (!this.isGeminiConfigured && !this.isOpenAIConfigured) {
      console.log('⚠️ No AI APIs configured - check GEMINI_API_KEY or GITHUB_TOKEN');
    }
  }

  async generateProject(request: AIGenerationRequest): Promise<AIGenerationResponse> {
    console.log(`🚀 Starting AI project generation...`);

    try {
      // Prioritize Gemini 2.5 Flash for high-quality code generation
      if (this.isGeminiConfigured && this.gemini) {
        console.log('🤖 Using Gemini 2.5 Flash for high-quality code generation...');
        return await this.generateWithGemini(request);
      }

      // Fallback to GPT-4.1 if Gemini not available
      if (this.isOpenAIConfigured && this.openai) {
        console.log('🤖 Falling back to GPT-4.1 with GitHub Models...');
        return await this.generateWithGPT4(request);
      }

      // Return error if no APIs configured
      return {
        success: false,
        message: 'No AI APIs configured. Please check GEMINI_API_KEY or GITHUB_TOKEN.',
        error: 'No APIs available'
      };

    } catch (error) {
      console.error('AI Generation error:', error);
      return {
        success: false,
        message: 'Failed to generate project with AI',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async generateWithGemini(request: AIGenerationRequest): Promise<AIGenerationResponse> {
    if (!this.gemini) throw new Error('Gemini not initialized');

    // Build high-quality system prompt for code generation
    const systemPrompt = this.buildGeminiSystemPrompt(request);
    const userMessage = this.buildUserMessage(request);

    console.log('🧠 Sending request to Gemini 2.5 Flash...');

    try {
      const response = await this.gemini.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            parts: [
              {
                text: `${systemPrompt}\n\nUser Request: ${userMessage}`
              }
            ]
          }
        ],
        config: {
          temperature: 0.7,
          maxOutputTokens: 4000,
          topP: 0.9,
        }
      });

      const responseText = response.text || '';
      console.log('✅ Gemini response received, length:', responseText.length);

      // Extract files from the Gemini response
      const files = this.extractFilesFromGeminiResponse(responseText);

      // Create preview server if files were generated
      let previewUrl = '';
      if (Object.keys(files).length > 0) {
        const projectId = `gemini-${Date.now()}`;
        const previewResult = await previewManager.createPreviewServer(projectId, files);
        previewUrl = previewResult.url;
        console.log(`🖥️ Preview server created: ${previewUrl}`);
      }

      return {
        success: true,
        message: responseText,
        files,
        previewUrl
      };

    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  }

  private async generateWithGPT4(request: AIGenerationRequest): Promise<AIGenerationResponse> {
    if (!this.openai) throw new Error('GPT-4.1 not initialized');

    // Dynamic system prompt based on request type
    const systemPrompt = this.buildDynamicSystemPrompt(request);
    const userMessage = this.buildUserMessage(request);

    console.log('🧠 Sending request to GPT-4.1...');

    const response = await this.openai.chat.completions.create({
      model: 'openai/gpt-4.1',
      max_tokens: 4000,
      temperature: 0.8,
      top_p: 0.9,
      messages: [
        { role: 'system', content: systemPrompt },
        ...request.conversationHistory || [],
        { role: 'user', content: userMessage }
      ],
    });

    const responseText = response.choices[0]?.message?.content || '';
    console.log('✅ GPT-4.1 response received, length:', responseText.length);

    // Extract files from the response
    const files = this.extractFilesFromGPTResponse(responseText);

    // Generate a preview if we have files
    let previewUrl = '';
    if (Object.keys(files).length > 0) {
      try {
        const projectId = `project_${Date.now()}`;
        const previewResult = await previewManager.createPreviewServer(projectId, files);
        previewUrl = previewResult.url;
        console.log('📱 Preview server created:', previewUrl);
      } catch (error) {
        console.warn('Failed to create preview server:', error);
      }
    }

    return {
      success: true,
      message: responseText,
      files,
      previewUrl
    };
  }

  private buildGeminiSystemPrompt(request: AIGenerationRequest): string {
    return `You are a thoughtful AI coding assistant who loves to chat and build amazing projects! 

PERSONALITY:
- Be conversational and friendly, not robotic
- Take time to think through what the user really wants
- Ask clarifying questions when needed
- Explain your thought process
- Show excitement about building cool stuff

INTELLIGENT PROJECT CREATION:
1. THINK FIRST: Analyze what type of project this should be
2. PLAN SMART: Choose the best tech stack and file structure for THIS specific project
3. BUILD THOUGHTFULLY: Create only the files that make sense for this project
4. CHAT NATURALLY: Explain what you're doing and why

RESPONSE STYLE:
- Start with friendly conversation about the project
- Explain your thinking and approach
- THEN create the appropriate files
- Make each file perfect for its purpose
- Use modern best practices

IMPORTANT: Don't just dump code! Have a conversation first, then intelligently create the right files for the project.
\`\`\`
project-name/
├── src/
│   ├── components/
│   │   ├── Layout.tsx
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── [list ALL component files]
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Dashboard.tsx
│   │   └── [list ALL page files]
│   ├── services/
│   │   └── api.ts
│   ├── styles/
│   │   ├── globals.css
│   │   └── [all style files]
│   ├── utils/
│   │   └── helpers.ts
│   ├── App.tsx
│   └── main.tsx
├── server/
│   ├── routes/
│   ├── models/
│   └── index.js
├── public/
│   └── [assets]
├── package.json
├── tsconfig.json
├── vite.config.js
└── README.md
\`\`\`

## Complete File Implementations:

\`\`\`json
// package.json
{
  "name": "project-name",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    [COMPLETE dependency list]
  }
}
\`\`\`

\`\`\`typescript
// src/App.tsx
[COMPLETE implementation - minimum 500+ lines]
\`\`\`

\`\`\`css
// src/styles/globals.css
[COMPLETE modern CSS with animations, gradients - minimum 300+ lines]
\`\`\`

[Continue with EVERY file listed in the structure]

QUALITY REQUIREMENTS:
- Modern React with TypeScript and hooks
- Tailwind CSS or styled-components for styling
- Framer Motion for animations
- Responsive design with mobile-first approach
- Dark mode support
- Accessibility features
- Error boundaries and loading states
- Form validation
- API integration
- State management
- Authentication flows
- Database schemas
- RESTful API endpoints

Remember: EVERY file must be COMPLETE and WORKING. No shortcuts.
}
...
\`\`\`

\`\`\`javascript
// filename: app.js
class ModernApp {
  constructor() {
    this.init();
  }
}
...
\`\`\``;
  }

  private buildDynamicSystemPrompt(request: AIGenerationRequest): string {
    return `You are an expert full-stack developer and AI assistant. Your task is to generate complete, production-ready applications based on user requests. 

Key requirements:
1. Generate COMPLETE, functional applications - not just templates
2. Include ALL necessary files (HTML, CSS, JavaScript, etc.)
3. Make applications visually appealing with modern design
4. Include proper error handling and user experience features
5. Add responsive design for mobile compatibility
6. Generate realistic, relevant content - never use placeholder text
7. Include interactive features and functionality
8. Vary your responses - don't repeat the same output

Structure your response with COMPLETE project files including folders:

\`\`\`json
// package.json
{
  "name": "app-name",
  "scripts": { "dev": "vite", "build": "vite build" }
}
\`\`\`

\`\`\`typescript
// src/App.tsx
import React from 'react';
export default function App() { /* FULL IMPLEMENTATION */ }
\`\`\`

\`\`\`typescript
// src/components/Header.tsx
// Complete component code
\`\`\`

\`\`\`css
// src/styles/main.css
/* Complete styles */
\`\`\`

Create files with paths like:
- src/App.tsx
- src/components/Button.tsx
- src/utils/helpers.ts
- src/styles/global.css
- index.html
- package.json
- tsconfig.json
- vite.config.ts

Build COMPLETE, WORKING applications with ALL files!`;
  }

  private extractFilesFromGeminiResponse(response: string): Record<string, { content: string; language: string }> {
    const files: Record<string, { content: string; language: string }> = {};

    // Look for file creation patterns in natural conversation
    const codeBlockRegex = /```(\w+)?\s*(?:\n(?:\/\/|#)\s*([^\n]+))?\s*\n([\s\S]*?)```/gi;

    let match;
    let fileCounter = 1;

    while ((match = codeBlockRegex.exec(response)) !== null) {
      const language = match[1] || 'text';
      let filepath = match[2]?.trim() || '';
      const content = match[3].trim();

      // Extract filename from various formats
      let filename = '';
      if (filepath) {
        // Handle paths like "src/App.tsx" or "// package.json"
        filepath = filepath.replace(/^[\/\s]+|[\/\s]+$/g, '');
        if (filepath.includes('/')) {
          const parts = filepath.split('/');
          filename = parts[parts.length - 1];
          // For nested files, add folder prefix
          if (parts.length > 2 && !filename.includes('.')) {
            const folder = parts[parts.length - 2];
            filename = `${folder}_${filename}`;
          }
        } else {
          filename = filepath;
        }
      }

      // Generate default if no filename
      if (!filename) {
        filename = this.generateDefaultFilename(language);
      }

      // Ensure unique filenames
      if (files[filename]) {
        const ext = this.getFileExtension(language);
        filename = `${filename.replace(/\.\w+$/, '')}_${fileCounter}.${ext}`;
      }

      if (content && content.length > 10) {
        files[filename] = {
          content,
          language: this.normalizeLanguage(language)
        };
      }
      fileCounter++;
    }

    // If no files found with filenames, extract all code blocks
    if (Object.keys(files).length === 0) {
      const simpleCodeBlockRegex = /```(\w+)?\s*([\s\S]*?)```/gi;
      let simpleMatch;
      let counter = 1;

      while ((simpleMatch = simpleCodeBlockRegex.exec(response)) !== null) {
        const language = simpleMatch[1] || 'text';
        const content = simpleMatch[2].trim();

        if (content && content.length > 10) {
          const filename = `file${counter}.${this.getFileExtension(language)}`;
          files[filename] = {
            content,
            language: this.normalizeLanguage(language)
          };
          counter++;
        }
      }
    }

    return files;
  }

  private extractFilesFromGPTResponse(response: string): Record<string, { content: string; language: string }> {
    const files: Record<string, { content: string; language: string }> = {};

    // Enhanced regex to capture various code block formats
    const codeBlockRegex = /```(\w+)(?::([^\n]+))?\n([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(response)) !== null) {
      const language = match[1].toLowerCase();
      const filename = match[2] || this.generateDefaultFilename(language);
      const content = match[3].trim();

      if (content) {
        files[filename] = {
          content,
          language: this.normalizeLanguage(language)
        };
      }
    }

    return files;
  }

  private buildUserMessage(request: AIGenerationRequest): string {
    return `Hey! I'd love your help building something cool. Here's what I'm thinking: "${request.prompt}"

I want you to:
1. Chat with me about this idea first - what do you think?
2. Take your time to plan the best approach
3. Choose the perfect tech stack and file structure
4. Create thoughtful, well-organized files
5. Make everything look amazing and work perfectly

Don't rush - I want this to be awesome! What's your take on this project?`;
  }



  private generateDefaultFilename(language: string): string {
    const extensions: Record<string, string> = {
      'html': 'index.html',
      'css': 'styles.css',
      'javascript': 'script.js',
      'js': 'script.js',
      'python': 'main.py',
      'py': 'main.py',
      'typescript': 'index.ts',
      'ts': 'index.ts',
      'json': 'data.json',
      'php': 'index.php',
      'react': 'App.jsx',
      'vue': 'App.vue'
    };

    return extensions[language] || `file.${language}`;
  }

  private getFileExtension(language: string): string {
    const extensions: Record<string, string> = {
      'html': 'html',
      'css': 'css',
      'javascript': 'js',
      'js': 'js',
      'typescript': 'ts',
      'ts': 'ts',
      'jsx': 'jsx',
      'tsx': 'tsx',
      'python': 'py',
      'py': 'py',
      'json': 'json',
      'sql': 'sql',
      'md': 'md',
      'markdown': 'md'
    };
    return extensions[language.toLowerCase()] || 'txt';
  }

  private normalizeLanguage(language: string): string {
    const langMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'py': 'python',
      'htm': 'html',
      'jsx': 'javascript',
      'tsx': 'typescript'
    };

    return langMap[language] || language;
  }

  private generateDefaultHTML(content: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Generated Application</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        h1 { color: #333; border-bottom: 3px solid #667eea; padding-bottom: 10px; }
        .content { white-space: pre-wrap; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 AI Generated Application</h1>
        <div class="content">${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
    </div>
</body>
</html>`;
  }

  private async generateWithEnhancedLocal(request: AIGenerationRequest): Promise<AIGenerationResponse> {
    console.log('🔧 Using enhanced local AI generation...');

    const projectType = request.projectType || 'web application';
    const prompt = request.prompt.toLowerCase();

    // Determine the best type of application to generate
    let appType = 'modern-web';
    if (prompt.includes('todo') || prompt.includes('task')) appType = 'todo-app';
    else if (prompt.includes('calculator')) appType = 'calculator';
    else if (prompt.includes('blog')) appType = 'blog';
    else if (prompt.includes('portfolio')) appType = 'portfolio';
    else if (prompt.includes('dashboard')) appType = 'dashboard';
    else if (prompt.includes('chat') || prompt.includes('messaging')) appType = 'chat-app';
    else if (prompt.includes('game')) appType = 'game';
    else if (prompt.includes('api')) appType = 'api';

    const files = this.generateEnhancedAppFiles(appType, request.prompt);

    return {
      success: true,
      message: `I've created a professional ${projectType} for you! This includes modern design, interactive features, and responsive layout. The application is fully functional and ready to use.`,
      files
    };
  }

  private generateEnhancedAppFiles(appType: string, prompt: string): Record<string, { content: string; language: string }> {
    switch (appType) {
      case 'todo-app':
        return this.generateTodoApp(prompt);
      case 'calculator':
        return this.generateCalculatorApp(prompt);
      case 'blog':
        return this.generateBlogApp(prompt);
      case 'portfolio':
        return this.generatePortfolioApp(prompt);
      case 'dashboard':
        return this.generateDashboardApp(prompt);
      case 'chat-app':
        return this.generateChatApp(prompt);
      case 'game':
        return this.generateGameApp(prompt);
      case 'api':
        return this.generateAPIProject(prompt);
      default:
        return this.generateModernWebApp(prompt);
    }
  }

  private generateTodoApp(prompt: string): Record<string, { content: string; language: string }> {
    return {
      'index.html': {
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TaskMaster Pro - Advanced Todo App</title>
    <link rel="stylesheet" href="styles.css">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body>
    <div class="app-container">
        <header class="app-header">
            <div class="header-content">
                <h1><i class="fas fa-tasks"></i> TaskMaster Pro</h1>
                <div class="stats">
                    <span class="stat">
                        <i class="fas fa-check-circle"></i>
                        <span id="completed-count">0</span> completed
                    </span>
                    <span class="stat">
                        <i class="fas fa-clock"></i>
                        <span id="pending-count">0</span> pending
                    </span>
                </div>
            </div>
        </header>

        <main class="main-content">
            <div class="add-task-section">
                <div class="input-group">
                    <input type="text" id="task-input" placeholder="What needs to be done?" maxlength="100">
                    <select id="priority-select">
                        <option value="low">Low Priority</option>
                        <option value="medium" selected>Medium Priority</option>
                        <option value="high">High Priority</option>
                    </select>
                    <button id="add-task-btn" class="add-btn">
                        <i class="fas fa-plus"></i> Add Task
                    </button>
                </div>
            </div>

            <div class="filter-section">
                <div class="filter-buttons">
                    <button class="filter-btn active" data-filter="all">All Tasks</button>
                    <button class="filter-btn" data-filter="pending">Pending</button>
                    <button class="filter-btn" data-filter="completed">Completed</button>
                </div>
                <div class="search-box">
                    <input type="text" id="search-input" placeholder="Search tasks...">
                    <i class="fas fa-search"></i>
                </div>
            </div>

            <div class="tasks-container">
                <div id="tasks-list" class="tasks-list"></div>
                <div id="empty-state" class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <h3>No tasks yet</h3>
                    <p>Add your first task to get started!</p>
                </div>
            </div>
        </main>
    </div>

    <script src="script.js"></script>
</body>
</html>`,
        language: 'html'
      },
      'styles.css': {
        content: `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    color: #333;
}

.app-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
}

.app-header {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 20px;
    padding: 30px;
    margin-bottom: 30px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
    backdrop-filter: blur(10px);
}

.header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 20px;
}

.app-header h1 {
    font-size: 2.5rem;
    font-weight: 700;
    background: linear-gradient(135deg, #667eea, #764ba2);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.stats {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
}

.stat {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: #666;
}

.main-content {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 20px;
    padding: 30px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
    backdrop-filter: blur(10px);
}

.add-task-section {
    margin-bottom: 30px;
}

.input-group {
    display: flex;
    gap: 15px;
    flex-wrap: wrap;
}

#task-input {
    flex: 1;
    min-width: 250px;
    padding: 15px 20px;
    border: 2px solid #e0e0e0;
    border-radius: 12px;
    font-size: 16px;
    transition: all 0.3s ease;
}

#task-input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

#priority-select {
    padding: 15px 20px;
    border: 2px solid #e0e0e0;
    border-radius: 12px;
    font-size: 16px;
    background: white;
    cursor: pointer;
    transition: all 0.3s ease;
}

#priority-select:focus {
    outline: none;
    border-color: #667eea;
}

.add-btn {
    padding: 15px 25px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    white-space: nowrap;
}

.add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
}

.filter-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
    flex-wrap: wrap;
    gap: 20px;
}

.filter-buttons {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.filter-btn {
    padding: 10px 20px;
    border: 2px solid #e0e0e0;
    background: white;
    border-radius: 25px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.3s ease;
}

.filter-btn.active,
.filter-btn:hover {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    border-color: #667eea;
}

.search-box {
    position: relative;
}

.search-box input {
    padding: 10px 40px 10px 15px;
    border: 2px solid #e0e0e0;
    border-radius: 25px;
    width: 250px;
    font-size: 14px;
}

.search-box i {
    position: absolute;
    right: 15px;
    top: 50%;
    transform: translateY(-50%);
    color: #999;
}

.tasks-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.task-item {
    display: flex;
    align-items: center;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 15px;
    border-left: 5px solid #667eea;
    transition: all 0.3s ease;
    animation: slideIn 0.3s ease;
}

.task-item:hover {
    transform: translateX(5px);
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
}

.task-item.completed {
    opacity: 0.7;
    border-left-color: #28a745;
}

.task-item.completed .task-text {
    text-decoration: line-through;
}

.task-checkbox {
    width: 20px;
    height: 20px;
    margin-right: 15px;
    cursor: pointer;
}

.task-content {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 15px;
}

.task-text {
    font-size: 16px;
    font-weight: 500;
}

.task-priority {
    padding: 5px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
}

.priority-high {
    background: #ff6b6b;
    color: white;
}

.priority-medium {
    background: #ffd93d;
    color: #333;
}

.priority-low {
    background: #6bcf7f;
    color: white;
}

.task-actions {
    display: flex;
    gap: 10px;
}

.action-btn {
    padding: 8px;
    border: none;
    background: none;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.3s ease;
}

.action-btn:hover {
    background: #e0e0e0;
}

.delete-btn:hover {
    background: #ff6b6b;
    color: white;
}

.empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #999;
}

.empty-state i {
    font-size: 4rem;
    margin-bottom: 20px;
    opacity: 0.5;
}

.empty-state h3 {
    font-size: 1.5rem;
    margin-bottom: 10px;
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateX(-20px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

@media (max-width: 768px) {
    .app-container {
        padding: 10px;
    }

    .header-content {
        flex-direction: column;
        text-align: center;
    }

    .input-group {
        flex-direction: column;
    }

    .filter-section {
        flex-direction: column;
        align-items: stretch;
    }

    .search-box input {
        width: 100%;
    }

    .task-content {
        flex-direction: column;
        align-items: flex-start;
    }
}`,
        language: 'css'
      },
      'script.js': {
        content: `class TaskManager {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.init();
    }

    init() {
        this.bindEvents();
        this.render();
        this.updateStats();
    }

    bindEvents() {
        // Add task
        document.getElementById('add-task-btn').addEventListener('click', () => this.addTask());
        document.getElementById('task-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTask();
        });

        // Filter tasks
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setFilter(e.target.dataset.filter));
        });

        // Search tasks
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.render();
        });
    }

    addTask() {
        const input = document.getElementById('task-input');
        const prioritySelect = document.getElementById('priority-select');
        const text = input.value.trim();

        if (!text) {
            this.showNotification('Please enter a task!', 'error');
            return;
        }

        if (text.length > 100) {
            this.showNotification('Task is too long! (Max 100 characters)', 'error');
            return;
        }

        const task = {
            id: Date.now() + Math.random(),
            text: text,
            completed: false,
            priority: prioritySelect.value,
            createdAt: new Date().toISOString(),
            completedAt: null
        };

        this.tasks.unshift(task);
        this.saveToStorage();

        input.value = '';
        prioritySelect.value = 'medium';

        this.render();
        this.updateStats();
        this.showNotification('Task added successfully!', 'success');
    }

    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            task.completedAt = task.completed ? new Date().toISOString() : null;
            this.saveToStorage();
            this.render();
            this.updateStats();

            const message = task.completed ? 'Task completed!' : 'Task reopened!';
            this.showNotification(message, 'success');
        }
    }

    deleteTask(id) {
        if (confirm('Are you sure you want to delete this task?')) {
            this.tasks = this.tasks.filter(t => t.id !== id);
            this.saveToStorage();
            this.render();
            this.updateStats();
            this.showNotification('Task deleted!', 'success');
        }
    }

    setFilter(filter) {
        this.currentFilter = filter;

        // Update active button
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(\`[data-filter="\${filter}"]\`).classList.add('active');

        this.render();
    }

    getFilteredTasks() {
        let filtered = this.tasks;

        // Apply status filter
        if (this.currentFilter === 'completed') {
            filtered = filtered.filter(task => task.completed);
        } else if (this.currentFilter === 'pending') {
            filtered = filtered.filter(task => !task.completed);
        }

        // Apply search filter
        if (this.searchQuery) {
            filtered = filtered.filter(task => 
                task.text.toLowerCase().includes(this.searchQuery)
            );
        }

        return filtered;
    }

    render() {
        const tasksList = document.getElementById('tasks-list');
        const emptyState = document.getElementById('empty-state');
        const filteredTasks = this.getFilteredTasks();

        if (filteredTasks.length === 0) {
            tasksList.style.display = 'none';
            emptyState.style.display = 'block';

            if (this.searchQuery) {
                emptyState.innerHTML = \`
                    <i class="fas fa-search"></i>
                    <h3>No tasks found</h3>
                    <p>Try adjusting your search or filter criteria</p>
                \`;
            } else if (this.currentFilter === 'completed') {
                emptyState.innerHTML = \`
                    <i class="fas fa-check-circle"></i>
                    <h3>No completed tasks</h3>
                    <p>Complete some tasks to see them here!</p>
                \`;
            } else if (this.currentFilter === 'pending') {
                emptyState.innerHTML = \`
                    <i class="fas fa-clock"></i>
                    <h3>No pending tasks</h3>
                    <p>Great job! All tasks are completed!</p>
                \`;
            } else {
                emptyState.innerHTML = \`
                    <i class="fas fa-clipboard-list"></i>
                    <h3>No tasks yet</h3>
                    <p>Add your first task to get started!</p>
                \`;
            }
            return;
        }

        tasksList.style.display = 'flex';
        emptyState.style.display = 'none';

        tasksList.innerHTML = filteredTasks.map(task => \`
            <div class="task-item \${task.completed ? 'completed' : ''}">
                <input 
                    type="checkbox" 
                    class="task-checkbox" 
                    \${task.completed ? 'checked' : ''}
                    onchange="taskManager.toggleTask(\${task.id})"
                >
                <div class="task-content">
                    <span class="task-text">\${this.escapeHtml(task.text)}</span>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <span class="task-priority priority-\${task.priority}">\${task.priority}</span>
                        <div class="task-actions">
                            <button class="action-btn delete-btn" onclick="taskManager.deleteTask(\${task.id})" title="Delete task">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        \`).join('');
    }

    updateStats() {
        const completedCount = this.tasks.filter(t => t.completed).length;
        const pendingCount = this.tasks.filter(t => !t.completed).length;

        document.getElementById('completed-count').textContent = completedCount;
        document.getElementById('pending-count').textContent = pendingCount;
    }

    saveToStorage() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = \`notification notification-\${type}\`;
        notification.innerHTML = \`
            <i class="fas fa-\${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>\${message}</span>
        \`;

        // Add styles if not already present
        if (!document.querySelector('style[data-notifications]')) {
            const style = document.createElement('style');
            style.setAttribute('data-notifications', 'true');
            style.textContent = \`
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 15px 20px;
                    border-radius: 10px;
                    color: white;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    z-index: 1000;
                    animation: slideInRight 0.3s ease;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                }
                .notification-success { background: #28a745; }
                .notification-error { background: #dc3545; }
                .notification-info { background: #17a2b8; }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            \`;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize the task manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.taskManager = new TaskManager();
});`,
        language: 'javascript'
      }
    };
  }

  private generateCalculatorApp(prompt: string): Record<string, { content: string; language: string }> {
    return {
      'index.html': {
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ProCalc - Advanced Calculator</title>
    <link rel="stylesheet" href="styles.css">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body>
    <div class="calculator-container">
        <div class="calculator">
            <div class="calculator-header">
                <h1><i class="fas fa-calculator"></i> ProCalc</h1>
                <div class="mode-toggle">
                    <button id="standard-mode" class="mode-btn active">Standard</button>
                    <button id="scientific-mode" class="mode-btn">Scientific</button>
                </div>
            </div>

            <div class="display-section">
                <div class="history-display" id="history"></div>
                <div class="main-display" id="display">0</div>
            </div>

            <div class="buttons-container">
                <!-- Memory buttons -->
                <div class="memory-row" id="memory-row">
                    <button class="btn memory-btn" onclick="calculator.memoryClear()">MC</button>
                    <button class="btn memory-btn" onclick="calculator.memoryRecall()">MR</button>
                    <button class="btn memory-btn" onclick="calculator.memoryAdd()">M+</button>
                    <button class="btn memory-btn" onclick="calculator.memorySubtract()">M-</button>
                    <button class="btn memory-btn" onclick="calculator.memoryStore()">MS</button>
                </div>

                <!-- Scientific functions row -->
                <div class="scientific-row" id="scientific-row" style="display: none;">
                    <button class="btn function-btn" onclick="calculator.scientificFunction('sin')">sin</button>
                    <button class="btn function-btn" onclick="calculator.scientificFunction('cos')">cos</button>
                    <button class="btn function-btn" onclick="calculator.scientificFunction('tan')">tan</button>
                    <button class="btn function-btn" onclick="calculator.scientificFunction('log')">log</button>
                    <button class="btn function-btn" onclick="calculator.scientificFunction('ln')">ln</button>
                </div>

                <div class="scientific-row" id="scientific-row2" style="display: none;">
                    <button class="btn function-btn" onclick="calculator.scientificFunction('sqrt')">√</button>
                    <button class="btn function-btn" onclick="calculator.scientificFunction('power')">x²</button>
                    <button class="btn function-btn" onclick="calculator.scientificFunction('factorial')">x!</button>
                    <button class="btn function-btn" onclick="calculator.scientificFunction('pi')">π</button>
                    <button class="btn function-btn" onclick="calculator.scientificFunction('e')">e</button>
                </div>

                <!-- Standard calculator buttons -->
                <div class="button-row">
                    <button class="btn clear-btn" onclick="calculator.clear()">C</button>
                    <button class="btn clear-btn" onclick="calculator.clearEntry()">CE</button>
                    <button class="btn operator-btn" onclick="calculator.backspace()">⌫</button>
                    <button class="btn operator-btn" onclick="calculator.inputOperator('/')">/</button>
                </div>

                <div class="button-row">
                    <button class="btn number-btn" onclick="calculator.inputNumber('7')">7</button>
                    <button class="btn number-btn" onclick="calculator.inputNumber('8')">8</button>
                    <button class="btn number-btn" onclick="calculator.inputNumber('9')">9</button>
                    <button class="btn operator-btn" onclick="calculator.inputOperator('*')">×</button>
                </div>

                <div class="button-row">
                    <button class="btn number-btn" onclick="calculator.inputNumber('4')">4</button>
                    <button class="btn number-btn" onclick="calculator.inputNumber('5')">5</button>
                    <button class="btn number-btn" onclick="calculator.inputNumber('6')">6</button>
                    <button class="btn operator-btn" onclick="calculator.inputOperator('-')">-</button>
                </div>

                <div class="button-row">
                    <button class="btn number-btn" onclick="calculator.inputNumber('1')">1</button>
                    <button class="btn number-btn" onclick="calculator.inputNumber('2')">2</button>
                    <button class="btn number-btn" onclick="calculator.inputNumber('3')">3</button>
                    <button class="btn operator-btn" onclick="calculator.inputOperator('+')">+</button>
                </div>

                <div class="button-row">
                    <button class="btn number-btn" onclick="calculator.toggleSign()">±</button>
                    <button class="btn number-btn" onclick="calculator.inputNumber('0')">0</button>
                    <button class="btn number-btn" onclick="calculator.inputDecimal()">.</button>
                    <button class="btn equals-btn" onclick="calculator.calculate()">=</button>
                </div>
            </div>

            <div class="history-panel" id="history-panel">
                <div class="history-header">
                    <h3>History</h3>
                    <button class="clear-history-btn" onclick="calculator.clearHistory()">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="history-list" id="history-list"></div>
            </div>
        </div>
    </div>

    <script src="script.js"></script>
</body>
</html>`,
        language: 'html'
      },
      'styles.css': {
        content: `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.calculator-container {
    display: flex;
    gap: 20px;
    max-width: 100%;
    width: 100%;
    max-width: 800px;
}

.calculator {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 25px;
    padding: 30px;
    box-shadow: 0 30px 60px rgba(0,0,0,0.2);
    backdrop-filter: blur(10px);
    flex: 1;
    max-width: 400px;
}

.calculator-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 25px;
    flex-wrap: wrap;
    gap: 15px;
}

.calculator-header h1 {
    font-size: 1.8rem;
    font-weight: 700;
    background: linear-gradient(135deg, #667eea, #764ba2);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.mode-toggle {
    display: flex;
    background: #f0f0f0;
    border-radius: 20px;
    padding: 3px;
}

.mode-btn {
    padding: 8px 16px;
    border: none;
    background: none;
    border-radius: 17px;
    cursor: pointer;
    font-weight: 600;
    font-size: 12px;
    transition: all 0.3s ease;
}

.mode-btn.active {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
}

.display-section {
    background: #1a1a1a;
    border-radius: 15px;
    padding: 20px;
    margin-bottom: 25px;
    min-height: 100px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
}

.history-display {
    color: #888;
    font-size: 14px;
    min-height: 20px;
    text-align: right;
    margin-bottom: 10px;
    word-wrap: break-word;
}

.main-display {
    color: white;
    font-size: 2.5rem;
    font-weight: 300;
    text-align: right;
    font-family: 'SF Mono', Monaco, monospace;
    min-height: 50px;
    display: flex;
    align-items: flex-end;
    justify-content: flex-end;
    word-wrap: break-word;
    overflow-wrap: break-word;
}

.buttons-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.button-row,
.memory-row,
.scientific-row {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 12px;
}

.button-row {
    grid-template-columns: repeat(4, 1fr);
}

.btn {
    height: 60px;
    border: none;
    border-radius: 12px;
    font-size: 18px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    user-select: none;
    display: flex;
    align-items: center;
    justify-content: center;
}

.btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0,0,0,0.15);
}

.btn:active {
    transform: translateY(0);
}

.number-btn {
    background: #f5f5f5;
    color: #333;
}

.number-btn:hover {
    background: #e8e8e8;
}

.operator-btn {
    background: linear-gradient(135deg, #ff6b6b, #ee5a24);
    color: white;
}

.operator-btn:hover {
    background: linear-gradient(135deg, #ff5252, #d63031);
}

.equals-btn {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
}

.equals-btn:hover {
    background: linear-gradient(135deg, #5a67d8, #6b46c1);
}

.clear-btn {
    background: linear-gradient(135deg, #feca57, #ff9ff3);
    color: white;
}

.clear-btn:hover {
    background: linear-gradient(135deg, #ff9ff3, #feca57);
}

.memory-btn {
    background: #e74c3c;
    color: white;
    font-size: 14px;
    height: 45px;
}

.memory-btn:hover {
    background: #c0392b;
}

.function-btn {
    background: #3498db;
    color: white;
    font-size: 14px;
    height: 45px;
}

.function-btn:hover {
    background: #2980b9;
}

.history-panel {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 25px;
    padding: 25px;
    box-shadow: 0 30px 60px rgba(0,0,0,0.2);
    backdrop-filter: blur(10px);
    width: 300px;
    max-height: 600px;
    display: flex;
    flex-direction: column;
}

.history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 2px solid #f0f0f0;
}

.history-header h3 {
    font-size: 1.3rem;
    color: #333;
}

.clear-history-btn {
    background: #e74c3c;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 8px 12px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.clear-history-btn:hover {
    background: #c0392b;
    transform: translateY(-1px);
}

.history-list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.history-item {
    background: #f8f9fa;
    padding: 15px;
    border-radius: 10px;
    border-left: 4px solid #667eea;
    cursor: pointer;
    transition: all 0.3s ease;
}

.history-item:hover {
    background: #e9ecef;
    transform: translateX(5px);
}

.history-calculation {
    font-size: 14px;
    color: #666;
    margin-bottom: 5px;
}

.history-result {
    font-size: 16px;
    font-weight: 600;
    color: #333;
}

.memory-indicator {
    position: absolute;
    top: 10px;
    right: 10px;
    background: #e74c3c;
    color: white;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
}

@media (max-width: 768px) {
    .calculator-container {
        flex-direction: column;
        align-items: center;
    }

    .calculator {
        max-width: 100%;
        width: 100%;
        margin-bottom: 20px;
    }

    .history-panel {
        width: 100%;
        max-width: 400px;
        max-height: 300px;
    }

    .calculator-header {
        flex-direction: column;
        text-align: center;
    }

    .main-display {
        font-size: 2rem;
    }

    .btn {
        height: 50px;
        font-size: 16px;
    }

    .memory-btn,
    .function-btn {
        height: 40px;
        font-size: 12px;
    }
}

@media (max-width: 480px) {
    .calculator {
        padding: 20px;
    }

    .main-display {
        font-size: 1.8rem;
    }

    .btn {
        height: 45px;
        font-size: 14px;
    }

    .button-row,
    .memory-row,
    .scientific-row {
        gap: 8px;
    }
}

/* Custom scrollbar for history */
.history-list::-webkit-scrollbar {
    width: 6px;
}

.history-list::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
}

.history-list::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 3px;
}

.history-list::-webkit-scrollbar-thumb:hover {
    background: #555;
}`,
        language: 'css'
      },
      'script.js': {
        content: `class Calculator {
    constructor() {
        this.currentOperand = '';
        this.previousOperand = '';
        this.operation = null;
        this.shouldResetDisplay = false;
        this.memory = 0;
        this.history = JSON.parse(localStorage.getItem('calculatorHistory')) || [];
        this.isScientificMode = false;

        this.init();
    }

    init() {
        this.updateDisplay();
        this.updateHistoryDisplay();
        this.bindEvents();
    }

    bindEvents() {
        // Mode toggle
        document.getElementById('standard-mode').addEventListener('click', () => this.setMode(false));
        document.getElementById('scientific-mode').addEventListener('click', () => this.setMode(true));

        // Keyboard support
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    setMode(scientific) {
        this.isScientificMode = scientific;

        // Update mode buttons
        const standardBtn = document.getElementById('standard-mode');
        const scientificBtn = document.getElementById('scientific-mode');

        if (scientific) {
            standardBtn.classList.remove('active');
            scientificBtn.classList.add('active');
            document.getElementById('scientific-row').style.display = 'grid';
            document.getElementById('scientific-row2').style.display = 'grid';
        } else {
            scientificBtn.classList.remove('active');
            standardBtn.classList.add('active');
            document.getElementById('scientific-row').style.display = 'none';
            document.getElementById('scientific-row2').style.display = 'none';
        }
    }

    inputNumber(number) {
        if (this.shouldResetDisplay) {
            this.currentOperand = '';
            this.shouldResetDisplay = false;
        }

        if (number === '0' && this.currentOperand === '0') return;
        if (this.currentOperand.includes('.') && number === '.') return;

        this.currentOperand = this.currentOperand.toString() + number.toString();
        this.updateDisplay();
    }

    inputDecimal() {
        if (this.shouldResetDisplay) {
            this.currentOperand = '0';
            this.shouldResetDisplay = false;
        }

        if (this.currentOperand === '') {
            this.currentOperand = '0';
        }

        if (this.currentOperand.indexOf('.') === -1) {
            this.currentOperand += '.';
        }

        this.updateDisplay();
    }

    inputOperator(operator) {
        if (this.currentOperand === '') return;

        if (this.previousOperand !== '') {
            this.calculate();
        }

        this.operation = operator;
        this.previousOperand = this.currentOperand;
        this.currentOperand = '';
        this.updateHistoryText();
    }

    calculate() {
        let computation;
        const prev = parseFloat(this.previousOperand);
        const current = parseFloat(this.currentOperand);

        if (isNaN(prev) || isNaN(current)) return;

        const calculation = \`\${this.previousOperand} \${this.getOperatorSymbol(this.operation)} \${this.currentOperand}\`;

        switch (this.operation) {
            case '+':
                computation = prev + current;
                break;
            case '-':
                computation = prev - current;
                break;
            case '*':
                computation = prev * current;
                break;
            case '/':
                if (current === 0) {
                    this.showError('Cannot divide by zero');
                    return;
                }
                computation = prev / current;
                break;
            default:
                return;
        }

        // Add to history
        this.addToHistory(calculation, computation);

        this.currentOperand = this.roundResult(computation).toString();
        this.operation = null;
        this.previousOperand = '';
        this.shouldResetDisplay = true;
        this.updateDisplay();
        this.clearHistoryText();
    }

    scientificFunction(func) {
        const current = parseFloat(this.currentOperand) || 0;
        let result;
        let calculation;

        switch (func) {
            case 'sin':
                result = Math.sin(this.toRadians(current));
                calculation = \`sin(\${current}°)\`;
                break;
            case 'cos':
                result = Math.cos(this.toRadians(current));
                calculation = \`cos(\${current}°)\`;
                break;
            case 'tan':
                result = Math.tan(this.toRadians(current));
                calculation = \`tan(\${current}°)\`;
                break;
            case 'log':
                if (current <= 0) {
                    this.showError('Invalid input for log');
                    return;
                }
                result = Math.log10(current);
                calculation = \`log(\${current})\`;
                break;
            case 'ln':
                if (current <= 0) {
                    this.showError('Invalid input for ln');
                    return;
                }
                result = Math.log(current);
                calculation = \`ln(\${current})\`;
                break;
            case 'sqrt':
                if (current < 0) {
                    this.showError('Invalid input for sqrt');
                    return;
                }
                result = Math.sqrt(current);
                calculation = \`√(\${current})\`;
                break;
            case 'power':
                result = Math.pow(current, 2);
                calculation = \`\${current}²\`;
                break;
            case 'factorial':
                if (current < 0 || current !== Math.floor(current) || current > 170) {
                    this.showError('Invalid input for factorial');
                    return;
                }
                result = this.factorial(current);
                calculation = \`\${current}!\`;
                break;
            case 'pi':
                result = Math.PI;
                calculation = 'π';
                break;
            case 'e':
                result = Math.E;
                calculation = 'e';
                break;
            default:
                return;
        }

        this.addToHistory(calculation, result);
        this.currentOperand = this.roundResult(result).toString();
        this.shouldResetDisplay = true;
        this.updateDisplay();
    }

    factorial(n) {
        if (n === 0 || n === 1) return 1;
        let result = 1;
        for (let i = 2; i <= n; i++) {
            result *= i;
        }
        return result;
    }

    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    toggleSign() {
        if (this.currentOperand !== '') {
            this.currentOperand = (parseFloat(this.currentOperand) * -1).toString();
            this.updateDisplay();
        }
    }

    clear() {
        this.currentOperand = '';
        this.previousOperand = '';
        this.operation = null;
        this.updateDisplay();
        this.clearHistoryText();
    }

    clearEntry() {
        this.currentOperand = '';
        this.updateDisplay();
    }

    backspace() {
        this.currentOperand = this.currentOperand.toString().slice(0, -1);
        this.updateDisplay();
    }

    // Memory functions
    memoryClear() {
        this.memory = 0;
        this.showNotification('Memory cleared');
    }

    memoryRecall() {
        this.currentOperand = this.memory.toString();
        this.shouldResetDisplay = true;
        this.updateDisplay();
        this.showNotification(\`Recalled: \${this.memory}\`);
    }

    memoryAdd() {
        const current = parseFloat(this.currentOperand) || 0;
        this.memory += current;
        this.showNotification(\`Added \${current} to memory\`);
    }

    memorySubtract() {
        const current = parseFloat(this.currentOperand) || 0;
        this.memory -= current;
        this.showNotification(\`Subtracted \${current} from memory\`);
    }

    memoryStore() {
        this.memory = parseFloat(this.currentOperand) || 0;
        this.showNotification(\`Stored \${this.memory} in memory\`);
    }

    // Display functions
    updateDisplay() {
        const display = document.getElementById('display');
        display.textContent = this.formatNumber(this.currentOperand) || '0';
    }

    updateHistoryText() {
        const history = document.getElementById('history');
        if (this.operation && this.previousOperand) {
            history.textContent = \`\${this.formatNumber(this.previousOperand)} \${this.getOperatorSymbol(this.operation)}\`;
        }
    }

    clearHistoryText() {
        document.getElementById('history').textContent = '';
    }

    formatNumber(number) {
        if (number === '') return '';

        const num = parseFloat(number);
        if (isNaN(num)) return number;

        // Handle very large or very small numbers
        if (Math.abs(num) >= 1e12 || (Math.abs(num) < 1e-6 && num !== 0)) {
            return num.toExponential(6);
        }

        return num.toLocaleString('en-US', { maximumFractionDigits: 10 });
    }

    roundResult(number) {
        return Math.round((number + Number.EPSILON) * 1000000000000) / 1000000000000;
    }

    getOperatorSymbol(operator) {
        const symbols = {
            '+': '+',
            '-': '-',
            '*': '×',
            '/': '÷'
        };
        return symbols[operator] || operator;
    }

    // History functions
    addToHistory(calculation, result) {
        const historyItem = {
            calculation,
            result: this.roundResult(result),
            timestamp: new Date().toLocaleTimeString()
        };

        this.history.unshift(historyItem);

        // Keep only last 50 calculations
        if (this.history.length > 50) {
            this.history = this.history.slice(0, 50);
        }

        this.saveHistory();
        this.updateHistoryDisplay();
    }

    updateHistoryDisplay() {
        const historyList = document.getElementById('history-list');

        if (this.history.length === 0) {
            historyList.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">No calculations yet</div>';
            return;
        }

        historyList.innerHTML = this.history.map(item => \`
            <div class="history-item" onclick="calculator.useHistoryResult(\${item.result})">
                <div class="history-calculation">\${item.calculation}</div>
                <div class="history-result">= \${this.formatNumber(item.result.toString())}</div>
            </div>
        \`).join('');
    }

    useHistoryResult(result) {
        this.currentOperand = result.toString();
        this.shouldResetDisplay = true;
        this.updateDisplay();
    }

    clearHistory() {
        if (confirm('Clear all history?')) {
            this.history = [];
            this.saveHistory();
            this.updateHistoryDisplay();
            this.showNotification('History cleared');
        }
    }

    saveHistory() {
        localStorage.setItem('calculatorHistory', JSON.stringify(this.history));
    }

    // Keyboard support
    handleKeyboard(e) {
        e.preventDefault();

        if (e.key >= '0' && e.key <= '9') {
            this.inputNumber(e.key);
        } else if (e.key === '.') {
            this.inputDecimal();
        } else if (e.key === '+' || e.key === '-' || e.key === '*' || e.key === '/') {
            this.inputOperator(e.key);
        } else if (e.key === 'Enter' || e.key === '=') {
            this.calculate();
        } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
            this.clear();
        } else if (e.key === 'Backspace') {
            this.backspace();
        }
    }

    // Utility functions
    showError(message) {
        document.getElementById('display').textContent = 'Error';
        this.showNotification(message, 'error');
        setTimeout(() => {
            this.clear();
        }, 2000);
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = \`notification notification-\${type}\`;
        notification.innerHTML = \`
            <i class="fas fa-\${type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>\${message}</span>
        \`;

        // Add styles if not already present
        if (!document.querySelector('style[data-notifications]')) {
            const style = document.createElement('style');
            style.setAttribute('data-notifications', 'true');
            style.textContent = \`
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 12px 20px;
                    border-radius: 8px;
                    color: white;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    z-index: 1000;
                    animation: slideInRight 0.3s ease;
                    box-shadow: 0 8px 20px rgba(0,0,0,0.15);
                }
                .notification-info { background: #3498db; }
                .notification-error { background: #e74c3c; }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            \`;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize calculator when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.calculator = new Calculator();
});`,
        language: 'javascript'
      }
    };
  }

  private generateModernWebApp(prompt: string): Record<string, { content: string; language: string }> {
    return {
      'index.html': {
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Modern Web Application</title>
    <link rel="stylesheet" href="styles.css">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body>
    <div class="app">
        <header class="header">
            <nav class="nav">
                <div class="logo">
                    <i class="fas fa-rocket"></i>
                    <span>ModernApp</span>
                </div>
                <ul class="nav-links">
                    <li><a href="#home" class="nav-link active">Home</a></li>
                    <li><a href="#features" class="nav-link">Features</a></li>
                    <li><a href="#about" class="nav-link">About</a></li>
                    <li><a href="#contact" class="nav-link">Contact</a></li>
                </ul>
                <button class="mobile-menu-btn">
                    <i class="fas fa-bars"></i>
                </button>
            </nav>
        </header>

        <main class="main">
            <section id="home" class="hero-section">
                <div class="hero-content">
                    <h1 class="hero-title">Welcome to the Future</h1>
                    <p class="hero-subtitle">Experience the next generation of web applications with our cutting-edge technology and beautiful design.</p>
                    <div class="hero-actions">
                        <button class="btn btn-primary">Get Started</button>
                        <button class="btn btn-secondary">Learn More</button>
                    </div>
                </div>
                <div class="hero-visual">
                    <div class="floating-card">
                        <i class="fas fa-chart-line"></i>
                        <span>Analytics</span>
                    </div>
                    <div class="floating-card">
                        <i class="fas fa-shield-alt"></i>
                        <span>Security</span>
                    </div>
                    <div class="floating-card">
                        <i class="fas fa-lightning-bolt"></i>
                        <span>Performance</span>
                    </div>
                </div>
            </section>

            <section id="features" class="features-section">
                <div class="container">
                    <h2 class="section-title">Powerful Features</h2>
                    <div class="features-grid">
                        <div class="feature-card">
                            <div class="feature-icon">
                                <i class="fas fa-mobile-alt"></i>
                            </div>
                            <h3>Responsive Design</h3>
                            <p>Perfectly optimized for all devices and screen sizes with fluid layouts and adaptive components.</p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <i class="fas fa-palette"></i>
                            </div>
                            <h3>Modern UI</h3>
                            <p>Beautiful, clean interface with smooth animations and intuitive user experience design.</p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <i class="fas fa-cog"></i>
                            </div>
                            <h3>Customizable</h3>
                            <p>Highly configurable with theme options, layout preferences, and personalization features.</p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <i class="fas fa-rocket"></i>
                            </div>
                            <h3>High Performance</h3>
                            <p>Optimized for speed with lazy loading, efficient caching, and minimal resource usage.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section id="about" class="about-section">
                <div class="container">
                    <div class="about-content">
                        <div class="about-text">
                            <h2 class="section-title">About Our Technology</h2>
                            <p>We believe in creating exceptional digital experiences through innovative technology and thoughtful design. Our platform combines cutting-edge development practices with user-centered design principles.</p>
                            <div class="stats">
                                <div class="stat">
                                    <span class="stat-number" data-target="10000">0</span>
                                    <span class="stat-label">Active Users</span>
                                </div>
                                <div class="stat">
                                    <span class="stat-number" data-target="500">0</span>
                                    <span class="stat-label">Projects</span>
                                </div>
                                <div class="stat">
                                    <span class="stat-number" data-target="99">0</span>
                                    <span class="stat-label">Uptime %</span>
                                </div>
                            </div>
                        </div>
                        <div class="about-visual">
                            <div class="tech-stack">
                                <div class="tech-item">HTML5</div>
                                <div class="tech-item">CSS3</div>
                                <div class="tech-item">JavaScript</div>
                                <div class="tech-item">React</div>
                                <div class="tech-item">Node.js</div>
                                <div class="tech-item">Cloud</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="contact" class="contact-section">
                <div class="container">
                    <h2 class="section-title">Get In Touch</h2>
                    <div class="contact-content">
                        <div class="contact-info">
                            <div class="contact-item">
                                <i class="fas fa-envelope"></i>
                                <div>
                                    <h4>Email</h4>
                                    <p>hello@modernapp.com</p>
                                </div>
                            </div>
                            <div class="contact-item">
                                <i class="fas fa-phone"></i>
                                <div>
                                    <h4>Phone</h4>
                                    <p>+1 (555) 123-4567</p>
                                </div>
                            </div>
                            <div class="contact-item">
                                <i class="fas fa-map-marker-alt"></i>
                                <div>
                                    <h4>Location</h4>
                                    <p>San Francisco, CA</p>
                                </div>
                            </div>
                        </div>
                        <form class="contact-form">
                            <div class="form-group">
                                <input type="text" placeholder="Your Name" required>
                            </div>
                            <div class="form-group">
                                <input type="email" placeholder="Your Email" required>
                            </div>
                            <div class="form-group">
                                <textarea placeholder="Your Message" rows="5" required></textarea>
                            </div>
                            <button type="submit" class="btn btn-primary">Send Message</button>
                        </form>
                    </div>
                </div>
            </section>
        </main>

        <footer class="footer">
            <div class="container">
                <div class="footer-content">
                    <div class="footer-brand">
                        <div class="logo">
                            <i class="fas fa-rocket"></i>
                            <span>ModernApp</span>
                        </div>
                        <p>Building the future, one pixel at a time.</p>
                    </div>
                    <div class="footer-links">
                        <div class="footer-column">
                            <h4>Product</h4>
                            <ul>
                                <li><a href="#">Features</a></li>
                                <li><a href="#">Pricing</a></li>
                                <li><a href="#">Documentation</a></li>
                            </ul>
                        </div>
                        <div class="footer-column">
                            <h4>Company</h4>
                            <ul>
                                <li><a href="#">About</a></li>
                                <li><a href="#">Careers</a></li>
                                <li><a href="#">Contact</a></li>
                            </ul>
                        </div>
                        <div class="footer-column">
                            <h4>Follow Us</h4>
                            <div class="social-links">
                                <a href="#"><i class="fab fa-twitter"></i></a>
                                <a href="#"><i class="fab fa-github"></i></a>
                                <a href="#"><i class="fab fa-linkedin"></i></a>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="footer-bottom">
                    <p>&copy; 2024 ModernApp. All rights reserved.</p>
                </div>
            </div>
        </footer>
    </div>

    <script src="script.js"></script>
</body>
</html>`,
        language: 'html'
      },
      'styles.css': {
        content: `/* Modern CSS Reset */
*,
*::before,
*::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

html {
    scroll-behavior: smooth;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    overflow-x: hidden;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

/* Header & Navigation */
.header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    z-index: 1000;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    max-width: 1200px;
    margin: 0 auto;
}

.logo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.5rem;
    font-weight: 700;
    color: #667eea;
}

.nav-links {
    display: flex;
    list-style: none;
    gap: 2rem;
}

.nav-link {
    text-decoration: none;
    color: #333;
    font-weight: 500;
    transition: color 0.3s ease;
    position: relative;
}

.nav-link:hover,
.nav-link.active {
    color: #667eea;
}

.nav-link.active::after {
    content: '';
    position: absolute;
    bottom: -5px;
    left: 0;
    right: 0;
    height: 2px;
    background: #667eea;
}

.mobile-menu-btn {
    display: none;
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #333;
}

/* Main Content */
.main {
    margin-top: 80px;
}

/* Hero Section */
.hero-section {
    min-height: 100vh;
    display: flex;
    align-items: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    position: relative;
    overflow: hidden;
}

.hero-section::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" patternUnits="userSpaceOnUse" width="100" height="100"><circle cx="50" cy="50" r="1" fill="%23ffffff" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
}

.hero-content {
    flex: 1;
    max-width: 600px;
    padding: 0 2rem;
    z-index: 2;
    position: relative;
}

.hero-title {
    font-size: clamp(2.5rem, 5vw, 4rem);
    font-weight: 800;
    margin-bottom: 1rem;
    line-height: 1.2;
}

.hero-subtitle {
    font-size: clamp(1.1rem, 2vw, 1.3rem);
    margin-bottom: 2rem;
    opacity: 0.9;
    line-height: 1.6;
}

.hero-actions {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
}

.btn {
    padding: 1rem 2rem;
    border: none;
    border-radius: 50px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}

.btn-primary {
    background: white;
    color: #667eea;
}

.btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.btn-secondary {
    background: transparent;
    color: white;
    border: 2px solid white;
}

.btn-secondary:hover {
    background: white;
    color: #667eea;
}

.hero-visual {
    flex: 1;
    position: relative;
    height: 500px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.floating-card {
    position: absolute;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 20px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    color: white;
    animation: float 6s ease-in-out infinite;
}

.floating-card:nth-child(1) {
    top: 20%;
    right: 20%;
    animation-delay: 0s;
}

.floating-card:nth-child(2) {
    bottom: 30%;
    right: 10%;
    animation-delay: 2s;
}

.floating-card:nth-child(3) {
    top: 50%;
    right: 40%;
    animation-delay: 4s;
}

.floating-card i {
    font-size: 2rem;
    margin-bottom: 0.5rem;
}

@keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
}

/* Features Section */
.features-section {
    padding: 6rem 0;
    background: #f8f9fa;
}

.section-title {
    text-align: center;
    font-size: clamp(2rem, 4vw, 3rem);
    font-weight: 700;
    margin-bottom: 3rem;
    color: #333;
}

.features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 2rem;
}

.feature-card {
    background: white;
    padding: 2.5rem 2rem;
    border-radius: 20px;
    text-align: center;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.feature-card:hover {
    transform: translateY(-10px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

.feature-icon {
    width: 80px;
    height: 80px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1.5rem;
    color: white;
    font-size: 2rem;
}

.feature-card h3 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1rem;
    color: #333;
}

.feature-card p {
    color: #666;
    line-height: 1.6;
}

/* About Section */
.about-section {
    padding: 6rem 0;
    background: white;
}

.about-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4rem;
    align-items: center;
}

.about-text .section-title {
    text-align: left;
    margin-bottom: 2rem;
}

.about-text p {
    font-size: 1.1rem;
    color: #666;
    margin-bottom: 2rem;
    line-height: 1.8;
}

.stats {
    display: flex;
    gap: 2rem;
    flex-wrap: wrap;
}

.stat {
    text-align: center;
}

.stat-number {
    display: block;
    font-size: 2.5rem;
    font-weight: 800;
    color: #667eea;
}

.stat-label {
    font-size: 0.9rem;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.about-visual {
    display: flex;
    justify-content: center;
}

.tech-stack {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    max-width: 300px;
}

.tech-item {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    padding: 1rem;
    border-radius: 15px;
    text-align: center;
    font-weight: 600;
    transform: rotate(-2deg);
    transition: transform 0.3s ease;
}

.tech-item:nth-child(even) {
    transform: rotate(2deg);
}

.tech-item:hover {
    transform: rotate(0deg) scale(1.05);
}

/* Contact Section */
.contact-section {
    padding: 6rem 0;
    background: #f8f9fa;
}

.contact-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4rem;
    margin-top: 3rem;
}

.contact-info {
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.contact-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    background: white;
    border-radius: 15px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.contact-item i {
    width: 50px;
    height: 50px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
}

.contact-item h4 {
    font-size: 1.1rem;
    font-weight: 600;
    color: #333;
    margin-bottom: 0.25rem;
}

.contact-item p {
    color: #666;
}

.contact-form {
    background: white;
    padding: 2rem;
    border-radius: 20px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.form-group {
    margin-bottom: 1.5rem;
}

.form-group input,
.form-group textarea {
    width: 100%;
    padding: 1rem;
    border: 2px solid #e0e0e0;
    border-radius: 10px;
    font-size: 1rem;
    transition: border-color 0.3s ease;
    resize: vertical;
}

.form-group input:focus,
.form-group textarea:focus {
    outline: none;
    border-color: #667eea;
}

/* Footer */
.footer {
    background: #333;
    color: white;
    padding: 3rem 0 1rem;
}

.footer-content {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 3rem;
    margin-bottom: 2rem;
}

.footer-brand p {
    margin-top: 1rem;
    color: #ccc;
}

.footer-links {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
}

.footer-column h4 {
    font-size: 1.2rem;
    font-weight: 600;
    margin-bottom: 1rem;
}

.footer-column ul {
    list-style: none;
}

.footer-column ul li {
    margin-bottom: 0.5rem;
}

.footer-column ul li a {
    color: #ccc;
    text-decoration: none;
    transition: color 0.3s ease;
}

.footer-column ul li a:hover {
    color: #667eea;
}

.social-links {
    display: flex;
    gap: 1rem;
}

.social-links a {
    width: 40px;
    height: 40px;
    background: #667eea;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    transition: background 0.3s ease;
}

.social-links a:hover {
    background: #764ba2;
}

.footer-bottom {
    border-top: 1px solid #444;
    padding-top: 1rem;
    text-align: center;
    color: #ccc;
}

/* Responsive Design */
@media (max-width: 768px) {
    .mobile-menu-btn {
        display: block;
    }

    .nav-links {
        display: none;
    }

    .hero-section {
        flex-direction: column;
        text-align: center;
        padding: 2rem 0;
    }

    .hero-visual {
        height: 300px;
        margin-top: 2rem;
    }

    .about-content,
    .contact-content {
        grid-template-columns: 1fr;
        gap: 2rem;
    }

    .stats {
        justify-content: center;
    }

    .footer-content {
        grid-template-columns: 1fr;
        gap: 2rem;
    }

    .footer-links {
        grid-template-columns: 1fr;
        gap: 1.5rem;
    }
}

@media (max-width: 480px) {
    .nav {
        padding: 1rem;
    }

    .hero-actions {
        flex-direction: column;
        align-items: center;
    }

    .btn {
        width: 100%;
        max-width: 300px;
    }

    .features-grid {
        grid-template-columns: 1fr;
    }

    .tech-stack {
        grid-template-columns: 1fr;
        max-width: 200px;
    }
}`,
        language: 'css'
      },
      'script.js': {
        content: `// Modern Web App JavaScript
class ModernApp {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        this.animateOnScroll();
        this.animateCounters();
        this.handleNavigation();
    }

    bindEvents() {
        // Mobile menu toggle
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        const navLinks = document.querySelector('.nav-links');

        if (mobileMenuBtn && navLinks) {
            mobileMenuBtn.addEventListener('click', () => {
                navLinks.classList.toggle('active');
            });
        }

        // Smooth scrolling for nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                const targetSection = document.querySelector(targetId);

                if (targetSection) {
                    targetSection.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }

                // Update active nav link
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });

        // Contact form submission
        const contactForm = document.querySelector('.contact-form');
        if (contactForm) {
            contactForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleContactForm(contactForm);
            });
        }

        // Hero action buttons
        document.querySelectorAll('.btn').forEach(btn => {
            if (btn.textContent.includes('Get Started')) {
                btn.addEventListener('click', () => {
                    document.querySelector('#features').scrollIntoView({
                        behavior: 'smooth'
                    });
                });
            }

            if (btn.textContent.includes('Learn More')) {
                btn.addEventListener('click', () => {
                    document.querySelector('#about').scrollIntoView({
                        behavior: 'smooth'
                    });
                });
            }
        });
    }

    handleNavigation() {
        // Update active nav link based on scroll position
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link');

        const observerOptions = {
            threshold: 0.3,
            rootMargin: '-50px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const currentId = entry.target.getAttribute('id');
                    navLinks.forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === \`#\${currentId}\`) {
                            link.classList.add('active');
                        }
                    });
                }
            });
        }, observerOptions);

        sections.forEach(section => observer.observe(section));
    }

    animateOnScroll() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animation = \`fadeInUp 0.8s ease forwards\`;
                }
            });
        }, observerOptions);

        // Observe elements for animation
        document.querySelectorAll('.feature-card, .contact-item, .tech-item').forEach(el => {
            observer.observe(el);
        });

        // Add CSS animation
        this.addAnimationStyles();
    }

    animateCounters() {
        const counters = document.querySelectorAll('.stat-number');
        const speed = 200; // The lower the slower

        const observerOptions = {
            threshold: 0.5
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const counter = entry.target;
                    const target = +counter.getAttribute('data-target');
                    const count = +counter.innerText;
                    const inc = target / speed;

                    if (count < target) {
                        counter.innerText = Math.ceil(count + inc);
                        setTimeout(() => this.updateCounter(counter), 1);
                    } else {
                        counter.innerText = target;
                    }
                }
            });
        }, observerOptions);

        counters.forEach(counter => {
            counter.innerText = '0';
            observer.observe(counter);
        });
    }

    updateCounter(counter) {
        const target = +counter.getAttribute('data-target');
        const count = +counter.innerText;
        const speed = 200;
        const inc = target / speed;

        if (count < target) {
            counter.innerText = Math.ceil(count + inc);
            setTimeout(() => this.updateCounter(counter), 1);
        } else {
            counter.innerText = target;
        }
    }

    handleContactForm(form) {
        const formData = new FormData(form);
        const name = form.querySelector('input[type="text"]').value;
        const email = form.querySelector('input[type="email"]').value;
        const message = form.querySelector('textarea').value;

        // Simulate form submission
        this.showNotification('Message sent successfully! We\\'ll get back to you soon.', 'success');

        // Reset form
        form.reset();

        // In a real application, you would send this data to your server
        console.log('Contact form submission:', { name, email, message });
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = \`notification notification-\${type}\`;
        notification.innerHTML = \`
            <i class="fas fa-\${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            <span>\${message}</span>
            <button class="notification-close">&times;</button>
        \`;

        // Add styles if not already present
        if (!document.querySelector('style[data-notifications]')) {
            const style = document.createElement('style');
            style.setAttribute('data-notifications', 'true');
            style.textContent = \`
                .notification {
                    position: fixed;
                    top: 100px;
                    right: 20px;
                    padding: 1rem 1.5rem;
                    border-radius: 10px;
                    color: white;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    z-index: 1001;
                    animation: slideInRight 0.3s ease;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                    max-width: 400px;
                }
                .notification-success { background: linear-gradient(135deg, #4CAF50, #45a049); }
                .notification-info { background: linear-gradient(135deg, #2196F3, #1976D2); }
                .notification-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 1.5rem;
                    cursor: pointer;
                    margin-left: auto;
                }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            \`;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // Close button functionality
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        });

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideInRight 0.3s ease reverse';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    addAnimationStyles() {
        if (!document.querySelector('style[data-animations]')) {
            const style = document.createElement('style');
            style.setAttribute('data-animations', 'true');
            style.textContent = \`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .feature-card,
                .contact-item,
                .tech-item {
                    opacity: 0;
                }

                @media (prefers-reduced-motion: reduce) {
                    * {
                        animation-duration: 0.01ms !important;
                        animation-iteration-count: 1 !important;
                        transition-duration: 0.01ms !important;
                    }
                }
            \`;
            document.head.appendChild(style);
        }
    }

    // Utility function for theme switching (can be extended)
    toggleTheme() {
        document.body.classList.toggle('dark-theme');
        localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
    }

    // Initialize theme from localStorage
    initTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.modernApp = new ModernApp();
});

// Add some interactive features
document.addEventListener('mousemove', (e) => {
    const cursor = document.querySelector('.custom-cursor');
    if (cursor) {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    }
});

// Parallax effect for hero section
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const parallax = document.querySelector('.hero-section');

    if (parallax) {
        const speed = scrolled * 0.5;
        parallax.style.backgroundPosition = \`center \${speed}px\`;
    }
});`,
        language: 'javascript'
      }
    };
  }

  // Additional app generators would go here...
  private generateBlogApp(prompt: string): Record<string, { content: string; language: string }> {
    // Implementation for blog app
    return this.generateModernWebApp(prompt);
  }

  private generatePortfolioApp(prompt: string): Record<string, { content: string; language: string }> {
    // Implementation for portfolio app
    return this.generateModernWebApp(prompt);
  }

  private generateDashboardApp(prompt: string): Record<string, { content: string; language: string }> {
    // Implementation for dashboard app
    return this.generateModernWebApp(prompt);
  }

  private generateChatApp(prompt: string): Record<string, { content: string; language: string }> {
    // Implementation for chat app
    return this.generateModernWebApp(prompt);
  }

  private generateGameApp(prompt: string): Record<string, { content: string; language: string }> {
    // Implementation for game app
    return this.generateModernWebApp(prompt);
  }

  private generateAPIProject(prompt: string): Record<string, { content: string; language: string }> {
    // Implementation for API project
    return this.generateModernWebApp(prompt);
  }
}

// Enhanced AI API for reliable local generation
export class EnhancedAI {
  static async generateProject(request: any) {
    const { prompt } = request;

    // Generate based on prompt type
    if (prompt.toLowerCase().includes('calculator')) {
      return {
        success: true,
        files: {
          'index.html': {
            content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Calculator</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="calculator">
        <input type="text" id="display" readonly>
        <div class="buttons">
            <button onclick="clearDisplay()">C</button>
            <button onclick="deleteLast()">⌫</button>
            <button onclick="operator('/')">/</button>
            <button onclick="operator('*')">×</button>

            <button onclick="number('7')">7</button>
            <button onclick="number('8')">8</button>
            <button onclick="number('9')">9</button>
            <button onclick="operator('-')">-</button>

            <button onclick="number('4')">4</button>
            <button onclick="number('5')">5</button>
            <button onclick="number('6')">6</button>
            <button onclick="operator('+')">+</button>

            <button onclick="number('1')">1</button>
            <button onclick="number('2')">2</button>
            <button onclick="number('3')">3</button>
            <button onclick="calculate()" class="equals">=</button>

            <button onclick="number('0')" class="zero">0</button>
            <button onclick="number('.')">.</button>
        </div>
    </div>
    <script src="script.js"></script>
</body>
</html>`,
            language: 'html'
          },
          'style.css': {
            content: `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
}

.calculator {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    padding: 20px;
    backdrop-filter: blur(10px);
    box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
    border: 1px solid rgba(255, 255, 255, 0.18);
}

#display {
    width: 100%;
    height: 80px;
    background: rgba(0, 0, 0, 0.3);
    border: none;
    border-radius: 10px;
    color: white;
    font-size: 2em;
    text-align: right;
    padding: 0 20px;
    margin-bottom: 20px;
    outline: none;
}

.buttons {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 15px;
}

button {
    height: 60px;
    border: none;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.2);
    color: white;
    font-size: 1.2em;
    cursor: pointer;
    transition: all 0.3s ease;
}

button:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
}

.equals {
    background: #ff6b6b !important;
}

.zero {
    grid-column: span 2;
}`,
            language: 'css'
          },
          'script.js': {
            content: `let display = document.getElementById('display');
let currentInput = '';
let operator = '';
let previousInput = '';

function number(num) {
    currentInput += num;
    display.value = currentInput;
}

function operator(op) {
    if (currentInput === '') return;
    if (previousInput !== '' && operator !== '') {
        calculate();
    }
    operator = op;
    previousInput = currentInput;
    currentInput = '';
}

function calculate() {
    if (previousInput === '' || currentInput === '' || operator === '') return;

    let result;
    const prev = parseFloat(previousInput);
    const current = parseFloat(currentInput);

    switch (operator) {
        case '+':
            result = prev + current;
            break;
        case '-':
            result = prev - current;
            break;
        case '*':
            result = prev * current;
            break;
        case '/':
            result = current !== 0 ? prev / current : 'Error';
            break;
        default:
            return;
    }

    currentInput = result.toString();
    operator = '';
    previousInput = '';
    display.value = currentInput;
}

function clearDisplay() {
    currentInput = '';
    operator = '';
    previousInput = '';
    display.value = '';
}

function deleteLast() {
    currentInput = currentInput.slice(0, -1);
    display.value = currentInput;
}`,
            language: 'javascript'
          }
        }
      };
    }

    // Default response for other prompts
    return {
      success: true,
      files: {
        'index.html': {
          content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated App</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <h1>Your App is Ready!</h1>
        <p>Built with AI assistance</p>
    </div>
    <script src="script.js"></script>
</body>
</html>`,
          language: 'html'
        },
        'style.css': {
          content: `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
}

.container {
    text-align: center;
    background: white;
    padding: 3rem;
    border-radius: 20px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
}

h1 {
    color: #333;
    margin-bottom: 1rem;
    font-size: 2.5rem;
}

p {
    color: #666;
    font-size: 1.2rem;
}`,
          language: 'css'
        },
        'script.js': {
          content: `console.log('App generated successfully!');

document.addEventListener('DOMContentLoaded', function() {
    console.log('Application loaded');
});`,
          language: 'javascript'
        }
      }
    };
  }
}

export async function main() {
  console.log('Enhanced AI system ready');
}

export const enhancedAI = new EnhancedAIService();