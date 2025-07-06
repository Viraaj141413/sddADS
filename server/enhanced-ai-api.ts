import { GoogleGenerativeAI } from "@google/generative-ai";

interface GenerationRequest {
  prompt: string;
  projectType?: string;
  conversationHistory?: any[];
  userId?: string;
}

interface GenerationResult {
  success: boolean;
  message?: string;
  files?: Record<string, any>;
  error?: string;
  previewUrl?: string;
}

class EnhancedAIService {
  private gemini: GoogleGenerativeAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.gemini = new GoogleGenerativeAI(apiKey);
      console.log('✅ Gemini AI initialized');
    } else {
      console.log('❌ No Gemini API key found');
    }
  }

  async generateProject(request: GenerationRequest): Promise<GenerationResult> {
    try {
      const { prompt } = request;

      if (!this.gemini) {
        return {
          success: false,
          error: 'Gemini API not configured. GEMINI_API_KEY environment variable is required.'
        };
      }

      return await this.generateWithGemini(prompt);
    } catch (error) {
      console.error('AI Generation error:', error);
      return {
        success: false,
        error: `API Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      };
    }
  }

  private async generateWithGemini(prompt: string): Promise<GenerationResult> {
    try {
      const model = this.gemini!.getGenerativeModel({ model: "gemini-2.5-flash" });

      const enhancedPrompt = `
You are an ENTERPRISE-GRADE FULL-STACK DEVELOPER. Generate COMPLETE, PRODUCTION-READY, SCALABLE applications.

ENTERPRISE REQUIREMENTS:
1. Generate ALL files needed with proper folder structure (server/, client/, shared/, tests/, docs/)
2. Create ADVANCED, MODERN code using LATEST frameworks and best practices
3. Include ALL configuration files with enterprise settings
4. Use TypeScript for type safety and better maintainability
5. Implement comprehensive error handling, logging, monitoring
6. Add security features: input validation, CSRF protection, rate limiting
7. Include unit tests and integration tests
8. Add detailed documentation and API specifications
9. Implement caching, performance optimization, and scalability features
10. NEVER delete existing files - only EDIT and IMPROVE them

FILE EDITING RULES:
- When updating existing projects, PRESERVE all existing code
- Only modify what needs to be changed
- Keep user customizations intact
- Debug systematically until issues are COMPLETELY resolved
- Add new features without breaking existing functionality

ENTERPRISE STRUCTURE:
- Frontend: client/src/App.tsx, client/src/components/*, client/src/services/*
- Backend: server/index.ts, server/routes/*, server/models/*, server/middleware/*
- Shared: shared/types/*, shared/utils/*, shared/constants/*
- Tests: tests/unit/*, tests/integration/*, tests/e2e/*
- Config: package.json, tsconfig.json, docker-compose.yml, nginx.conf
- Docs: README.md, API.md, ARCHITECTURE.md, DEPLOYMENT.md

FORMAT EACH FILE LIKE THIS:
\`\`\`typescript:server/index.ts
// Enterprise-grade server with logging, monitoring, error handling
\`\`\`

\`\`\`tsx:client/src/App.tsx
// Advanced React app with state management, routing, auth
\`\`\`

ENTERPRISE FEATURES TO INCLUDE:
- Advanced authentication with JWT and session management
- Database connection pooling and query optimization
- Redis caching for performance
- WebSocket support for real-time features
- Microservices architecture patterns
- Docker containerization
- CI/CD pipeline configuration
- Monitoring and alerting setup
- Automated backup strategies
- Load balancing configuration
- Security headers and CORS setup
- API versioning and documentation
- Error tracking and logging system
- Performance metrics collection

DEBUGGING APPROACH:
- Identify root cause systematically
- Fix issues completely, not partially
- Add comprehensive error handling
- Include detailed logging for debugging
- Test thoroughly after fixes
- Keep fixing until 100% working
- Real-time features (WebSockets)
- Database integration
- Responsive design
- Loading states
- Error boundaries
- Form validation
- API middleware
- Environment variables
- Production optimizations

User request: "${prompt}"

Generate a COMPLETE, IMPRESSIVE application with ALL files needed!
`;

      const result = await model.generateContent(enhancedPrompt);
      const response = await result.response;
      const text = response.text();

      // Extract files from response
      const files = this.extractFilesFromResponse(text);

      return {
        success: true,
        message: text,
        files: files
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      return {
        success: false,
        error: `Gemini API Error: ${error instanceof Error ? error.message : 'Unknown Gemini API error'}`
      };
    }
  }

  private extractFilesFromResponse(response: string): Record<string, { content: string; language: string }> {
    const files: Record<string, { content: string; language: string }> = {};
    
    // Updated regex to handle both formats: ```language:path/file.ext and ```language
    const codeBlockRegex = /```(\w+)(?::([^\n]+))?\n([\s\S]*?)```/g;
    let match;
    let fileIndex = 0;

    while ((match = codeBlockRegex.exec(response)) !== null) {
      const language = match[1] || 'text';
      const filepath = match[2]; // This captures the path after the colon
      const content = match[3].trim();
      
      if (content) {
        let filename: string;
        
        // If filepath is provided (e.g., server/index.js), use it
        if (filepath) {
          filename = filepath.trim();
        } else {
          // Otherwise determine filename based on language
          filename = `file${fileIndex + 1}`;
        if (language === 'html') filename = 'index.html';
        else if (language === 'css') filename = 'styles.css';
        else if (language === 'javascript' || language === 'js') filename = 'script.js';
        else if (language === 'jsx') filename = 'App.jsx';
        else if (language === 'python') filename = 'main.py';
        else if (language === 'json') filename = 'data.json';
        else if (language === 'typescript' || language === 'ts') filename = 'main.ts';
        else filename = `${filename}.${language}`;
        
        files[filename] = { content, language };
        fileIndex++;
      }
    }

    return files;
  }
}

export class EnhancedAI {
  static async generateProject(request: GenerationRequest): Promise<GenerationResult> {
    const service = new EnhancedAIService();
    return service.generateProject(request);
  }
}

export const enhancedAI = new EnhancedAIService();

export async function main() {
  console.log('Enhanced AI API service initialized');
  return enhancedAI;
}