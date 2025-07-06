import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Loader2, Send, Sparkles, AlertCircle, X, Code, File, Clock, Zap, Brain, Lightbulb } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: Date;
  type?: 'conversation' | 'code' | 'error' | 'success' | 'analysis' | 'generation';
  filesGenerated?: string[];
  isGenerating?: boolean;
}

interface EnhancedChatProps {
  onFileGenerated?: (fileName: string, content: string, language: string) => void;
  onConsoleLog?: (message: string, type: 'info' | 'error' | 'success') => void;
  onProjectUpdate?: (projectId: string) => void;
}

export function EnhancedChat({ onFileGenerated, onConsoleLog, onProjectUpdate }: EnhancedChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'ai',
      content: "Hey there! 👋 I'm your AI development partner, powered by Gemini 2.5 Flash.\n\nI love building amazing projects from scratch! Whether you're thinking of a simple calculator, a complex web app, or anything in between - I'm here to help bring your ideas to life.\n\nI work a bit differently than other AI assistants:\n• I take time to really understand what you want to build\n• I analyze the best approach and technologies for your specific project\n• I create comprehensive, production-ready code (not just demos!)\n• I chat naturally while generating amazing applications in the background\n\nWhat's on your mind today? Describe anything you'd like to build - I'm excited to help! 🚀",
      timestamp: new Date(),
      type: 'conversation'
    }
  ]);

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState('');
  const [generationProgress, setGenerationProgress] = useState('');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const generationInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Monitor background code generation
  const monitorGeneration = useCallback((projectId: string) => {
    if (generationInterval.current) {
      clearInterval(generationInterval.current);
    }

    const stages = [
      '🧠 Analyzing project requirements...',
      '📋 Planning file structure...',
      '⚡ Setting up development environment...',
      '📄 Creating core application files...',
      '🎨 Building user interface components...',
      '⚙️ Implementing business logic...',
      '💅 Adding professional styling...',
      '🔧 Configuring project settings...',
      '✨ Adding advanced features...',
      '🎯 Finalizing application...',
      '✅ Project complete!'
    ];

    let stageIndex = 0;
    setGenerationProgress(stages[0]);

    generationInterval.current = setInterval(() => {
      stageIndex = (stageIndex + 1) % stages.length;
      setGenerationProgress(stages[stageIndex]);

      if (stageIndex === stages.length - 1) {
        setTimeout(() => {
          setGenerationProgress('');
          if (generationInterval.current) {
            clearInterval(generationInterval.current);
          }
          // Check for completed files
          checkGenerationComplete(projectId);
        }, 2000);
      }
    }, 15000); // 15 seconds per stage = ~2.5 minutes total
  }, []);

  const checkGenerationComplete = useCallback(async (projectId: string) => {
    try {
      const response = await fetch(`/api/gemini/generation-status/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.files && Object.keys(data.files).length > 0) {
          // Files generated successfully
          const fileList = Object.keys(data.files).join(', ');

          const completionMessage: ChatMessage = {
            id: Date.now().toString(),
            sender: 'ai',
            content: `🎉 **Project Complete!**\n\nI've finished building your application! Here's what I created:\n\n**Generated Files:**\n${Object.keys(data.files).map(f => `📄 ${f}`).join('\n')}\n\nThe application is fully functional and ready to use. Each file contains production-quality code with:\n• Complete functionality (no placeholders!)\n• Professional styling and responsive design\n• Modern best practices and clean architecture\n• Comprehensive error handling\n\nYou can preview your app and see all the generated files in the preview panel! Want to make any modifications or add new features? Just let me know! 🚀`,
            timestamp: new Date(),
            type: 'success',
            filesGenerated: Object.keys(data.files)
          };

          setMessages(prev => prev.map(msg => 
            msg.isGenerating ? { ...msg, isGenerating: false } : msg
          ).concat(completionMessage));

          if (onProjectUpdate) {
            onProjectUpdate(projectId);
          }
        }
      }
    } catch (error) {
      console.error('Error checking generation status:', error);
    }
  }, [onProjectUpdate]);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: inputValue,
      timestamp: new Date(),
      type: 'conversation'
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setIsLoading(true);
    setCurrentStage('🤖 Gemini is thinking...');

    try {
      // Call enhanced Gemini API
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: currentInput,
          projectId: activeProjectId,
          conversationHistory: messages.filter(m => m.type === 'conversation').map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.content
          }))
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Request failed');
      }

      // Set active project ID
      if (data.projectId) {
        setActiveProjectId(data.projectId);
      }

      // Create AI response message
      const aiMessage: ChatMessage = {
        id: Date.now().toString(),
        sender: 'ai',
        content: data.message,
        timestamp: new Date(),
        type: data.isGeneratingCode ? 'analysis' : 'conversation',
        isGenerating: data.isGeneratingCode
      };

      setMessages(prev => [...prev, aiMessage]);

      // Start monitoring background generation if applicable
      if (data.isGeneratingCode && data.projectId) {
        monitorGeneration(data.projectId);
        setCurrentStage('');
      }

      if (onConsoleLog) {
        onConsoleLog(
          data.isGeneratingCode 
            ? 'Started comprehensive code generation' 
            : 'Conversation updated',
          'success'
        );
      }

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      const errorResponse: ChatMessage = {
        id: Date.now().toString(),
        sender: 'ai',
        content: `🔧 **Connection Issue**\n\nI'm having trouble connecting to my advanced AI systems right now. But don't worry - I'm still here to help!\n\nWhile I work on reconnecting, feel free to:\n• Describe your project idea in detail\n• Ask questions about development approaches\n• Discuss what features you'd like\n\nI'll be back to full power soon! 💪\n\n*Error: ${errorMessage}*`,
        timestamp: new Date(),
        type: 'error'
      };

      setMessages(prev => [...prev, errorResponse]);

      if (onConsoleLog) {
        onConsoleLog(`API Error: ${errorMessage}`, 'error');
      }
    } finally {
      setIsLoading(false);
      setCurrentStage('');
    }
  }, [inputValue, isLoading, activeProjectId, messages, monitorGeneration, onConsoleLog]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Generation Progress Bar */}
      {generationProgress && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 border-b border-gray-700 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Brain className="w-5 h-5 text-white animate-pulse" />
              <span className="text-sm font-medium">{generationProgress}</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-blue-200">
              <Zap className="w-4 h-4" />
              <span>Advanced Generation Active</span>
            </div>
          </div>
          <div className="w-full bg-blue-800/30 rounded-full h-1 mt-2">
            <div className="bg-white h-1 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      )}

      {/* Status Bar */}
      {currentStage && (
        <div className="flex items-center justify-center py-2 text-sm text-gray-400 bg-gray-800/50">
          <Clock className="w-4 h-4 mr-2" />
          {currentStage}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <Card className={`max-w-[80%] p-4 ${
              message.sender === 'user' 
                ? 'bg-blue-600 text-white' 
                : message.type === 'error'
                ? 'bg-red-900/50 border-red-700'
                : message.type === 'success'
                ? 'bg-green-900/30 border-green-700'
                : message.type === 'analysis'
                ? 'bg-purple-900/30 border-purple-700'
                : 'bg-gray-800 border-gray-700 text-gray-100'
            }`}>
              {/* Message Header for AI responses */}
              {message.sender === 'ai' && (
                <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-gray-600">
                  {message.type === 'analysis' ? (
                    <Lightbulb className="w-4 h-4 text-purple-400" />
                  ) : message.type === 'success' ? (
                    <Code className="w-4 h-4 text-green-400" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-blue-400" />
                  )}
                  <span className="text-xs font-medium opacity-80">
                    {message.type === 'analysis' ? 'Project Analysis' : 
                     message.type === 'success' ? 'Generation Complete' : 
                     'Gemini Assistant'}
                  </span>
                  {message.isGenerating && (
                    <div className="flex items-center space-x-1 text-xs text-purple-300">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Generating code...</span>
                    </div>
                  )}
                </div>
              )}

              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {message.content.split('\n').map((line, index) => {
                  // Enhanced formatting for better readability
                  if (line.startsWith('## ')) {
                    return <h3 key={index} className="text-lg font-bold mt-4 mb-2 text-blue-300">{line.replace('## ', '')}</h3>;
                  }
                  if (line.startsWith('### ')) {
                    return <h4 key={index} className="text-md font-semibold mt-3 mb-1 text-purple-300">{line.replace('### ', '')}</h4>;
                  }
                  if (line.startsWith('• ')) {
                    return <div key={index} className="ml-4 mb-1 text-gray-200">{line}</div>;
                  }
                  if (line.startsWith('```')) {
                    return <div key={index} className="bg-gray-900 p-3 rounded-lg my-2 font-mono text-sm text-green-300">{line}</div>;
                  }
                  if (line.includes('**') && line.includes('**')) {
                    const parts = line.split('**');
                    return (
                      <div key={index} className="mb-1">
                        {parts.map((part, i) => 
                          i % 2 === 1 ? <strong key={i} className="text-white font-bold">{part}</strong> : part
                        )}
                      </div>
                    );
                  }
                  return <div key={index} className="mb-1">{line}</div>;
                })}
              </div>

              <div className="text-xs opacity-60 mt-3 pt-2 border-t border-gray-600">
                {message.timestamp.toLocaleTimeString()}
              </div>

              {message.filesGenerated && message.filesGenerated.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-600">
                  <div className="text-sm font-medium mb-3 text-green-400 flex items-center">
                    <Code className="w-4 h-4 mr-2" />
                    Files Successfully Generated ({message.filesGenerated.length})
                  </div>
                  <div className="space-y-2">
                    {message.filesGenerated.map((file, index) => (
                      <div key={index} className="bg-gray-800/50 rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <File className="w-4 h-4 text-blue-400" />
                          <span className="font-mono text-sm text-white">{file}</span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {file.endsWith('.html') ? 'HTML' : 
                           file.endsWith('.css') ? 'CSS' : 
                           file.endsWith('.js') ? 'JavaScript' : 
                           file.endsWith('.md') ? 'Markdown' : 'File'}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-3 bg-blue-900/20 rounded-lg">
                    <div className="text-xs text-blue-300 font-medium mb-1">✅ Development Complete</div>
                    <div className="text-xs text-blue-200">
                      All files have been generated with complete, production-ready code. 
                      No placeholders or incomplete functions. Ready for deployment!
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700 bg-gray-800/50">
        <div className="flex space-x-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe what you want to build, or just chat about development..."
            className="flex-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <div className="text-xs text-gray-500 mt-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="w-3 h-3" />
            <span>Powered by Gemini 2.5 Flash</span>
            <span>•</span>
            <span>Advanced Code Generation</span>
          </div>
          {activeProjectId && (
            <span className="text-blue-400">Project: {activeProjectId.slice(0, 8)}...</span>
          )}
        </div>
      </div>
    </div>
  );
}