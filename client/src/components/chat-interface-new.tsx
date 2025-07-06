import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Loader2, Send, Sparkles, Zap, Code, Cpu, Database, Globe, Smartphone, GamepadIcon, Calculator, ChevronDown, ChevronUp, Settings, Play, Square, RotateCcw, Download, ExternalLink, Trash2, Copy, Check, AlertCircle, X, Brain, FileCode, Layers, Rocket, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import { useAuth } from '../hooks/useAuth';

// Types and interfaces
interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: Date;
  type?: 'system' | 'code' | 'normal' | 'response' | 'plan';
  metadata?: {
    filesGenerated?: string[];
    technologies?: string[];
    estimatedLines?: number;
    planItems?: string[];
  };
}

interface PlanStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed';
  estimatedTime: number;
  files: string[];
}

interface LiveCodingState {
  fileName: string;
  content: string;
  isActive: boolean;
  language: string;
  progress: number;
  currentLine: number;
  totalLines: number;
  typingSpeed: number;
  isThinking: boolean;
  complexity: string;
  patterns: string[];
}

interface ChatInterfaceProps {
  project?: any;
  onConsoleLog?: (message: string, type: 'info' | 'error' | 'success') => void;
  onAppUpdate?: (files: any[]) => void;
  onFileGenerated?: (fileName: string, content: string, language: string) => void;
}

// Generation stages with realistic timing
const PLANNING_PHASES = [
  { key: 'analyze', name: 'Analyzing Requirements', emoji: '🔍', duration: 3000 },
  { key: 'plan', name: 'Creating Development Plan', emoji: '📋', duration: 2500 },
  { key: 'approve', name: 'Waiting for Plan Approval', emoji: '⏳', duration: 0 },
  { key: 'architect', name: 'Designing Architecture', emoji: '🏗️', duration: 4000 },
  { key: 'code', name: 'Writing Code', emoji: '💻', duration: 8000 },
  { key: 'optimize', name: 'Optimizing & Testing', emoji: '⚡', duration: 3000 },
  { key: 'complete', name: 'Project Complete', emoji: '✅', duration: 1000 }
];

// Keywords that indicate user wants to build something
const BUILD_KEYWORDS = [
  'create', 'build', 'make', 'develop', 'generate', 'website', 'app', 'game', 
  'calculator', 'todo', 'dashboard', 'portfolio', 'landing', 'page', 'site',
  'application', 'tool', 'component', 'project', 'system', 'interface', 'ui'
];

// Main component
function ChatInterface({ project, onConsoleLog, onAppUpdate, onFileGenerated }: ChatInterfaceProps) {
  const { createProject } = useProjects();
  const { user } = useAuth();

  // State Management
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'ai',
      content: 'Hey! 👋 I\'m your AI developer assistant. I can help you with:\n\n💻 **Building Projects**: "Create a todo app", "Build a calculator", "Make a portfolio website"\n🤔 **Answering Questions**: Ask me about coding, frameworks, or development\n💡 **Code Help**: Get assistance with debugging, optimization, or best practices\n\nWhat would you like to work on today?',
      timestamp: new Date(),
      type: 'system'
    }
  ]);

  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string>('');
  const [developmentPlan, setDevelopmentPlan] = useState<PlanStep[]>([]);
  const [planApproved, setPlanApproved] = useState(false);
  const [showPlanApproval, setShowPlanApproval] = useState(false);

  const [liveCoding, setLiveCoding] = useState<LiveCodingState>({
    fileName: '',
    content: '',
    isActive: false,
    language: '',
    progress: 0,
    currentLine: 0,
    totalLines: 0,
    typingSpeed: 80,
    isThinking: false,
    complexity: '',
    patterns: []
  });

  const [conversationMode, setConversationMode: any] = useState<'chat' | 'building'>('chat');

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Effects
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check if user wants to build something
  const shouldBuildProject = useCallback((input: string): boolean => {
    const lowerInput = input.toLowerCase();
    return BUILD_KEYWORDS.some(keyword => lowerInput.includes(keyword));
  }, []);

  // Handle conversational responses
  const handleConversationalResponse = useCallback(async (userInput: string) => {
    setIsGenerating(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: `You are a helpful AI coding assistant. The user said: "${userInput}". Respond conversationally and helpfully. If they seem to want to build something, suggest they use specific language like "create a [project type]" or "build a [application]". Keep responses concise and friendly.`,
          conversationHistory: messages.slice(-5)
        })
      });

      if (response.ok) {
        const data = await response.json();
        const aiResponse: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          content: data.response || "I'm here to help! Try asking me to build something specific like 'create a todo app' or 'make a calculator'.",
          timestamp: new Date(),
          type: 'response'
        };
        setMessages(prev => [...prev, aiResponse]);
      } else {
        throw new Error('Failed to get AI response');
      }
    } catch (error) {
      console.error('Conversation error:', error);
      const fallbackResponse: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        content: "I'm here to help! What would you like me to build for you? Try something like:\n\n• 'Create a todo app'\n• 'Build a calculator'\n• 'Make a portfolio website'\n• 'Build a game'\n\nOr ask me any coding questions!",
        timestamp: new Date(),
        type: 'response'
      };
      setMessages(prev => [...prev, fallbackResponse]);
    }

    setIsGenerating(false);
  }, [messages]);

  // Utility functions
  const createDevelopmentPlan = useCallback((userInput: string) => {
    const projectType = detectProjectType(userInput);
    const complexity = detectComplexity(userInput);

    let planSteps: PlanStep[] = [];

    // Base plan structure
    if (projectType === 'website') {
      planSteps = [
        {
          id: '1',
          title: 'HTML Structure',
          description: 'Create semantic HTML layout with modern best practices',
          status: 'pending',
          estimatedTime: 2,
          files: ['index.html']
        },
        {
          id: '2', 
          title: 'CSS Styling',
          description: 'Design responsive styles with animations and modern CSS',
          status: 'pending',
          estimatedTime: 3,
          files: ['styles.css']
        },
        {
          id: '3',
          title: 'JavaScript Logic',
          description: 'Implement interactive features and functionality',
          status: 'pending',
          estimatedTime: 4,
          files: ['script.js']
        }
      ];
    } else if (projectType === 'app') {
      planSteps = [
        {
          id: '1',
          title: 'App Foundation',
          description: 'Set up React components and structure',
          status: 'pending',
          estimatedTime: 3,
          files: ['App.tsx', 'index.html']
        },
        {
          id: '2',
          title: 'Component Logic',
          description: 'Build interactive components with state management',
          status: 'pending',
          estimatedTime: 5,
          files: ['components.tsx']
        },
        {
          id: '3',
          title: 'Styling & Polish',
          description: 'Add beautiful styling and animations',
          status: 'pending',
          estimatedTime: 3,
          files: ['styles.css']
        }
      ];
    } else {
      // Generic plan
      planSteps = [
        {
          id: '1',
          title: 'Core Structure',
          description: 'Build the main application structure',
          status: 'pending',
          estimatedTime: 3,
          files: ['main.html', 'app.js']
        },
        {
          id: '2',
          title: 'Features & Logic',
          description: 'Implement key features and functionality',
          status: 'pending',
          estimatedTime: 4,
          files: ['logic.js']
        },
        {
          id: '3',
          title: 'Design & UX',
          description: 'Polish with beautiful design and user experience',
          status: 'pending',
          estimatedTime: 2,
          files: ['styles.css']
        }
      ];
    }

    return planSteps;
  }, []);

  const detectProjectType = (input: string): string => {
    const lower = input.toLowerCase();
    if (lower.includes('website') || lower.includes('portfolio') || lower.includes('landing')) return 'website';
    if (lower.includes('app') || lower.includes('application') || lower.includes('react')) return 'app';
    if (lower.includes('game') || lower.includes('play')) return 'game';
    if (lower.includes('dashboard') || lower.includes('admin')) return 'dashboard';
    return 'website';
  };

  const detectComplexity = (input: string): 'simple' | 'medium' | 'complex' => {
    const featureCount = (input.match(/\b(feature|function|page|component|system)\b/gi) || []).length;
    if (featureCount >= 5) return 'complex';
    if (featureCount >= 2) return 'medium';
    return 'simple';
  };

  // Live coding simulation with realistic typing
  const simulateRealisticCoding = useCallback(async (fileName: string, code: string, language: string) => {
    const lines = code.split('\n');
    const totalLines = lines.length;

    setLiveCoding({
      fileName,
      content: '',
      isActive: true,
      language,
      progress: 0,
      currentLine: 0,
      totalLines,
      typingSpeed: 60 + Math.random() * 40,
      isThinking: false,
      complexity: totalLines > 100 ? 'complex' : totalLines > 50 ? 'medium' : 'simple',
      patterns: ['Clean Code', 'Best Practices', 'Modern Standards']
    });

    let currentContent = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Simulate thinking pauses for complex lines
      if (line.includes('function') || line.includes('class') || line.includes('const') || line.includes('import')) {
        setLiveCoding(prev => ({ ...prev, isThinking: true }));
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
        setLiveCoding(prev => ({ ...prev, isThinking: false }));
      }

      // Type each character with realistic speed variation
      for (let j = 0; j < line.length; j++) {
        currentContent = lines.slice(0, i).join('\n') + (i > 0 ? '\n' : '') + line.slice(0, j + 1);

        setLiveCoding(prev => ({
          ...prev,
          content: currentContent,
          currentLine: i + 1,
          progress: Math.round(((i * line.length + j + 1) / (totalLines * 20)) * 100)
        }));

        const charDelay = 40 + Math.random() * 80;
        await new Promise(resolve => setTimeout(resolve, charDelay));
      }

      currentContent += '\n';
      setLiveCoding(prev => ({
        ...prev,
        content: currentContent,
        progress: Math.round(((i + 1) / totalLines) * 100)
      }));

      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 300));
    }

    setLiveCoding(prev => ({ ...prev, progress: 100, isActive: false }));

    if (onFileGenerated) {
    }
  }, [onFileGenerated]);

  // Main AI generation flow for building projects
  const handleAIGeneration = useCallback(async (userInput: string) => {
    setIsGenerating(true);
    setConversationMode('building');
    setCurrentPhase('analyze');

    // Phase 1: Analyze requirements
    const analysisMessage: ChatMessage = {
      id: `analysis-${Date.now()}`,
      sender: 'ai',
      content: '🔍 **Analyzing Requirements...**\n\nOkay, let me plan out exactly what you want to build...',
      timestamp: new Date(),
      type: 'system'
    };
    setMessages(prev => [...prev, analysisMessage]);

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Phase 2: Create plan
    setCurrentPhase('plan');
    const plan = createDevelopmentPlan(userInput);
    setDevelopmentPlan(plan);

    const planMessage: ChatMessage = {
      id: `plan-${Date.now()}`,
      sender: 'ai', 
      content: `📋 **Development Plan Created**\n\nI'll build your project in ${plan.length} phases:\n\n${plan.map((step, i) => `**${i + 1}. ${step.title}**\n${step.description}\n⏱️ ~${step.estimatedTime} minutes\n📁 Files: ${step.files.join(', ')}\n`).join('\n')}\n**Total estimated time: ${plan.reduce((acc, step) => acc + step.estimatedTime, 0)} minutes**\n\n🤔 Should I proceed with this plan?`,
      timestamp: new Date(),
      type: 'plan',
      metadata: {
        planItems: plan.map(step => step.title)
      }
    };
    setMessages(prev => [...prev, planMessage]);
    setShowPlanApproval(true);
    setCurrentPhase('approve');
  }, [createDevelopmentPlan]);

  // Execute the approved plan
  const executePlan = useCallback(async () => {
    setShowPlanApproval(false);
    setPlanApproved(true);
    setCurrentPhase('architect');

    // Architecture phase
    const archMessage: ChatMessage = {
      id: `arch-${Date.now()}`,
      sender: 'ai',
      content: '🏗️ **Designing Architecture...**\n\nCreating optimal file structure and component hierarchy...',
      timestamp: new Date(),
      type: 'system'
    };
    setMessages(prev => [...prev, archMessage]);

    await new Promise(resolve => setTimeout(resolve, 4000));

    // Start coding phase
    setCurrentPhase('code');
    const codingMessage: ChatMessage = {
      id: `coding-${Date.now()}`,
      sender: 'ai',
      content: '💻 **Starting Live Development...**\n\nWatch me code your project in real-time!',
      timestamp: new Date(),
      type: 'system'
    };
    setMessages(prev => [...prev, codingMessage]);

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Execute each plan step with live coding
    for (let i = 0; i < developmentPlan.length; i++) {
      const step = developmentPlan[i];

      setDevelopmentPlan(prev => prev.map((s, idx) => ({
        ...s,
        status: idx === i ? 'active' : idx < i ? 'completed' : 'pending'
      })));

      const stepMessage: ChatMessage = {
        id: `step-${i}-${Date.now()}`,
        sender: 'ai',
        content: `🚀 **${step.title}**\n\n${step.description}\n\nCreating files: ${step.files.join(', ')}`,
        timestamp: new Date(),
        type: 'system'
      };
      setMessages(prev => [...prev, stepMessage]);

      for (const fileName of step.files) {
        const code = await generateCodeForFile(fileName, developmentPlan[0]?.title || 'Project');
        await simulateRealisticCoding(fileName, code, getLanguageFromFileName(fileName));
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setDevelopmentPlan(prev => prev.map((s, idx) => ({
        ...s,
        status: idx <= i ? 'completed' : 'pending'
      })));
    }

    // Optimization phase
    setCurrentPhase('optimize');
    const optimizeMessage: ChatMessage = {
      id: `optimize-${Date.now()}`,
      sender: 'ai',
      content: '⚡ **Optimizing & Testing...**\n\nFine-tuning performance and ensuring quality...',
      timestamp: new Date(),
      type: 'system'
    };
    setMessages(prev => [...prev, optimizeMessage]);

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Completion
    setCurrentPhase('complete');
    const completeMessage: ChatMessage = {
      id: `complete-${Date.now()}`,
      sender: 'ai',
      content: `✅ **Project Complete!**\n\n🎉 Successfully created ${0} files with professional quality!\n\n📁 **Generated Files:**\n\n🚀 Your project is ready to use!`,
      timestamp: new Date(),
      type: 'code',
      metadata: {
        filesGenerated: [],
        technologies: ['HTML5', 'CSS3', 'JavaScript'],
        estimatedLines: 0
      }
    };
    setMessages(prev => [...prev, completeMessage]);

    setIsGenerating(false);
    setCurrentPhase('');
    setConversationMode('chat');
  }, [developmentPlan, simulateRealisticCoding]);

  // Generate realistic code for files
  const generateCodeForFile = useCallback(async (fileName: string, projectType: string): Promise<string> => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: `Generate professional ${fileName} for a ${projectType} project. Make it modern, feature-rich, and production-ready. Include only the code, no explanations.`
        })
      });

      if (response.ok) {
        const data = await response.json();
        const codeBlocks = data.response.match(/```[\w+]?\n([\s\S]*?)```/g) || [];
        if (codeBlocks.length > 0) {
          return codeBlocks[0].replace(/```\w*\n/, '').replace(/```$/, '');
        }
        return data.response;
      } else {
        throw new Error('Failed to generate code');
      }
    } catch (error) {
      console.error('Code generation error:', error);
      return '// Error generating code. Please try again.';
    }
  }, []);

  // Get language from filename
  const getLanguageFromFileName = (fileName: string): string => {
    if (fileName.endsWith('.html')) return 'html';
    if (fileName.endsWith('.css')) return 'css';
    if (fileName.endsWith('.js')) return 'javascript';
    if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) return 'typescript';
    return 'javascript';
  };

  // Handle user input and send messages
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');

    // Add user message to chat
    setMessages(prev => [...prev, {
      id: Date.now(),
      sender: 'user',
      content: userMessage,
      timestamp: new Date()
    }]);

    setIsLoading(true);

    try {
      console.log('Sending message to API:', userMessage);

      // Determine request type based on user input
      let requestType = 'chat';
      if (userMessage.toLowerCase().includes('build') || 
          userMessage.toLowerCase().includes('create') ||
          userMessage.toLowerCase().includes('make')) {
        requestType = 'build';
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: userMessage,
          prompt: userMessage,
          requestType: requestType,
          conversationId: Date.now().toString()
        }),
      });

      const data = await response.json();
      console.log('API Response:', data);

      if (data.success && data.response) {
        // Add AI response to chat
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          type: 'assistant',
          content: data.response,
          timestamp: new Date()
        }]);

      } else {
        throw new Error(data.error || 'No response received');
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Plan approval actions
  const approvePlan = () => {
    setMessages(prev => [...prev, {
      id: `approve-user-${Date.now()}`,
      sender: 'user',
      content: 'Yes, proceed with the plan!',
      timestamp: new Date(),
      type: 'normal'
    }]);
    executePlan();
  };

  const rejectPlan = () => {
    setMessages(prev => [...prev, {
      id: `reject-user-${Date.now()}`,
      sender: 'user',
      content: 'No, let\'s revise the plan.',
      timestamp: new Date(),
      type: 'normal'
    }]);
    setShowPlanApproval(false);
    setConversationMode('chat');
  };

  // JSX Rendering
  return (
    <div className="flex flex-col h-screen">
      {/* Chat Messages */}
      <div className="flex-grow overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div key={message.id} className={`mb-2 ${message.sender === 'user' ? 'text-right' : 'text-left'}`}>
            <div className={`inline-block p-2 rounded-lg ${message.sender === 'user' ? 'bg-blue-200 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
              {message.type === 'system' && <div className="text-sm italic">{message.content}</div>}
              {message.type === 'code' && (
                <div>
                  <p>{message.content}</p>
                  {message.metadata && message.metadata.filesGenerated && (
                    <div>
                      <p>Generated Files:</p>
                      <ul>
                        {message.metadata.filesGenerated.map(file => <li key={file}>{file}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              {message.type === 'plan' && (
                <div>
                  <p>{message.content}</p>
                </div>
              )}
              {message.type === 'response' && <div className="whitespace-pre-line">{message.content}</div>}
              {message.type !== 'system' && message.type !== 'code' && message.type !== 'plan' && message.type !== 'response' && <div className="whitespace-pre-line">{message.content}</div>}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="text-left">
            <div className="inline-block p-2 rounded-lg bg-gray-100 text-gray-800">
              <Loader2 className="inline-block animate-spin" size={20} /> Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Plan Approval */}
      {showPlanApproval && (
        <div className="p-4 bg-yellow-100 border-t border-yellow-300">
          <p>Do you approve this development plan?</p>
          <div className="flex justify-center mt-2">
            <Button onClick={approvePlan} className="mr-4 bg-green-500 hover:bg-green-700 text-white">Approve</Button>
            <Button onClick={rejectPlan} className="bg-red-500 hover:bg-red-700 text-white">Reject</Button>
          </div>
        </div>
      )}

      {/* Live Coding Display */}
      {liveCoding.isActive && (
        <div className="p-4 bg-gray-800 text-white">
          <h3 className="text-lg font-semibold">Live Coding: {liveCoding.fileName}</h3>
          <div className="mb-2">
            Progress: {liveCoding.progress}% | Line: {liveCoding.currentLine} / {liveCoding.totalLines}
          </div>
          <pre className="bg-gray-700 p-3 rounded-md"><code className={`language-${liveCoding.language}`}>{liveCoding.content}</code></pre>
          {liveCoding.isThinking && <div className="text-yellow-400 italic">Thinking...</div>}
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-gray-300">
        <div className="flex items-center">
          <Input
            type="text"
            placeholder="Enter your message..."
            className="flex-grow rounded-l-md"
            value={inputMessage}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
          />
          <Button onClick={handleSendMessage} className="rounded-r-md bg-blue-500 hover:bg-blue-700 text-white" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ChatInterface;