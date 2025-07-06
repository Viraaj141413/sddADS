/**
 * Gemini Natural Chat - Real conversational AI with background code generation
 * Two-phase approach: Natural conversation + Background code generation
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { storePreview } from './preview-store';
import { nanoid } from 'nanoid';

interface NaturalChatRequest {
  message: string;
  conversationHistory: Array<{ role: string; content: string }>;
  userId: string;
  userName: string;
}

interface CodeGenerationRequest {
  prompt: string;
  projectType: string;
  context: string;
}

class GeminiNaturalChat {
  private gemini: GoogleGenerativeAI | null = null;
  private conversationModel: any = null;
  private codeModel: any = null;
  
  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      // Use flash for conversation (faster, more natural)
      this.conversationModel = this.gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
      // Use pro for code generation (better quality)
      this.codeModel = this.gemini.getGenerativeModel({ model: 'gemini-1.5-pro' });
      console.log('✅ Gemini Natural Chat initialized with dual models');
    }
  }
  
  async generateNaturalResponse(request: NaturalChatRequest): Promise<{
    conversationalResponse: string;
    suggestedProject?: string;
    projectType?: string;
  }> {
    if (!this.conversationModel) {
      throw new Error('Gemini not initialized');
    }
    
    try {
      // Build conversation context
      const conversationPrompt = `You are Gemini, the AI assistant powering CloudAI - a trillion-dollar enterprise AI platform. 
You're having a natural conversation with ${request.userName}.

Your personality:
- Friendly, helpful, and conversational
- Excited about helping users build amazing things
- You speak naturally, like a real person
- You're proud to be part of CloudAI's mission
- You understand code but talk about it in simple terms

Current conversation history:
${request.conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

User: ${request.message}

Respond naturally and conversationally. If they're asking about building something, chat about it naturally while understanding what they want to create. Don't generate code in your response - just talk about their idea enthusiastically.`;

      const result = await this.conversationModel.generateContent(conversationPrompt);
      const response = result.response.text();
      
      // Detect if user wants to build something
      const buildKeywords = ['create', 'build', 'make', 'develop', 'generate', 'app', 'website', 'api', 'dashboard'];
      const wantsToBuild = buildKeywords.some(keyword => 
        request.message.toLowerCase().includes(keyword)
      );
      
      let projectType = 'webapp';
      if (request.message.toLowerCase().includes('api')) projectType = 'api';
      if (request.message.toLowerCase().includes('dashboard')) projectType = 'dashboard';
      if (request.message.toLowerCase().includes('mobile')) projectType = 'mobile';
      if (request.message.toLowerCase().includes('game')) projectType = 'game';
      
      return {
        conversationalResponse: response,
        suggestedProject: wantsToBuild ? request.message : undefined,
        projectType: wantsToBuild ? projectType : undefined
      };
    } catch (error) {
      console.error('Natural conversation error:', error);
      throw error;
    }
  }
  
  async generateCodeInBackground(request: CodeGenerationRequest): Promise<{
    files: Record<string, { content: string; language: string }>;
    projectId: string;
    previewUrl: string;
  }> {
    if (!this.codeModel) {
      throw new Error('Gemini not initialized');
    }
    
    try {
      const codePrompt = `You are an expert developer. Generate a complete, production-ready ${request.projectType} based on this request:

"${request.prompt}"

Requirements:
1. Generate a COMPLETE application with ALL necessary files
2. Include proper folder structure
3. Use modern best practices and frameworks
4. Add error handling, validation, and security
5. Include a README.md with setup instructions
6. Make it production-ready, not a demo

Based on the project type "${request.projectType}", use appropriate technology:
- webapp: React + TypeScript + Tailwind CSS
- api: Node.js + Express + TypeScript
- dashboard: React + Charts + Data visualization
- mobile: React Native or Flutter
- game: HTML5 Canvas or Phaser.js

Generate the complete file structure with full implementations. Each file should be production-quality code.

Respond in this exact format:
\`\`\`json
{
  "files": {
    "path/to/file.ext": {
      "content": "full file content here",
      "language": "javascript"
    }
  }
}
\`\`\``;

      const result = await this.codeModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: codePrompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 30000, // Large output for complete projects
        }
      });
      
      const response = result.response.text();
      
      // Extract JSON from response
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from Gemini');
      }
      
      const parsed = JSON.parse(jsonMatch[1]);
      const files = parsed.files || {};
      
      // Ensure we have substantial content
      if (Object.keys(files).length < 3) {
        throw new Error('Insufficient files generated');
      }
      
      // Store preview
      const projectId = nanoid();
      storePreview(projectId, files);
      
      return {
        files,
        projectId,
        previewUrl: `/api/preview-files/${projectId}`
      };
    } catch (error) {
      console.error('Code generation error:', error);
      throw error;
    }
  }
  
  async processUserMessage(
    message: string,
    conversationHistory: Array<{ role: string; content: string }>,
    userId: string,
    userName: string
  ): Promise<{
    conversationalResponse: string;
    codeGeneration?: {
      status: 'started' | 'completed' | 'failed';
      files?: Record<string, { content: string; language: string }>;
      projectId?: string;
      previewUrl?: string;
      error?: string;
    };
  }> {
    // Phase 1: Natural conversation response
    const naturalResponse = await this.generateNaturalResponse({
      message,
      conversationHistory,
      userId,
      userName
    });
    
    const result: any = {
      conversationalResponse: naturalResponse.conversationalResponse
    };
    
    // Phase 2: Background code generation if needed
    if (naturalResponse.suggestedProject) {
      result.codeGeneration = { status: 'started' };
      
      // Start code generation in background
      this.generateCodeInBackground({
        prompt: naturalResponse.suggestedProject,
        projectType: naturalResponse.projectType || 'webapp',
        context: conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')
      }).then(codeResult => {
        result.codeGeneration = {
          status: 'completed',
          files: codeResult.files,
          projectId: codeResult.projectId,
          previewUrl: codeResult.previewUrl
        };
      }).catch(error => {
        result.codeGeneration = {
          status: 'failed',
          error: error.message
        };
      });
    }
    
    return result;
  }
  
  isReady(): boolean {
    return this.gemini !== null && this.conversationModel !== null && this.codeModel !== null;
  }
}

export const geminiNaturalChat = new GeminiNaturalChat();