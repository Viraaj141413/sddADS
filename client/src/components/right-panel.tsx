import React, { useState, useEffect } from 'react';
import { Eye, Terminal, MessageSquare, Code, FileText, Zap, Monitor, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Project } from '@/lib/file-system';
import ChatInterface from './chat-interface-new';

interface RightPanelProps {
  project: Project;
  activeFile: string | null;
  isGenerating?: boolean;
  currentFile?: string;
  generatedCode?: string;
  previewContent?: string;
  onConsoleLog?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

type TabType = 'preview' | 'console' | 'chat';

interface LiveCoding {
  fileName: string;
  content: string;
  progress: number;
  isActive: boolean;
}

export default function RightPanel({ 
  project, 
  activeFile, 
  isGenerating = false, 
  currentFile = '', 
  generatedCode = '',
  previewContent = '',
  onConsoleLog 
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('preview');
  const [consoleOutput, setConsoleOutput] = useState([
    { timestamp: new Date().toLocaleTimeString(), message: '$ Ready', type: 'success' }
  ]);
  const [liveCoding, setLiveCoding] = useState<LiveCoding>({
    fileName: '',
    content: '',
    progress: 0,
    isActive: false
  });
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);

  const tabs = [
    { id: 'preview' as TabType, label: 'Preview', icon: Eye },
    { id: 'console' as TabType, label: 'Console', icon: Terminal },
    { id: 'chat' as TabType, label: 'Chat', icon: MessageSquare }
  ];

  // Update live coding when generation is happening
  useEffect(() => {
    if (isGenerating && currentFile) {
      setLiveCoding({
        fileName: currentFile,
        content: generatedCode,
        progress: Math.min((generatedCode.length / 1000) * 100, 100),
        isActive: true
      });
      setShowPreview(false);
    } else if (!isGenerating && previewContent) {
      setLiveCoding({ fileName: '', content: '', progress: 0, isActive: false });
      setShowPreview(true);
    }
  }, [isGenerating, currentFile, generatedCode, previewContent]);

  const handleRefreshPreview = () => {
    const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.location.reload();
    }
  };

  const handleClearConsole = () => {
    setConsoleOutput([
      { timestamp: new Date().toLocaleTimeString(), message: '$ Console cleared', type: 'info' }
    ]);
  };

  const addToConsole = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setConsoleOutput(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    }]);
    if (onConsoleLog) onConsoleLog(message, type);
  };

  // Check for generated files and update preview URL
  useEffect(() => {
    const checkForFiles = async () => {
      try {
        const response = await fetch('/api/files/list');
        if (response.ok) {
          const data = await response.json();
          if (data.files && Object.keys(data.files).length > 0) {
            // Set preview URL to our preview endpoint
            setPreviewUrl('/preview/index.html');
            setShowPreview(true);
            addToConsole(`✅ Files detected: ${Object.keys(data.files).join(', ')}`, 'success');
          }
        }
      } catch (error) {
        console.error('Error checking files:', error);
      }
    };

    // Check for files every 2 seconds
    const interval = setInterval(checkForFiles, 2000);
    checkForFiles(); // Initial check

    return () => clearInterval(interval);
  }, []);

  const renderPreviewContent = () => {
    if (previewUrl) {
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-3 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              <span className="text-sm font-medium">Live Preview</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefreshPreview}
              className="text-gray-400 hover:text-white"
            >
              <Zap className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 bg-white">
            <iframe
              id="preview-iframe"
              src={previewUrl}
              className="w-full h-full border-none"
              title="Preview"
              onLoad={() => addToConsole('🚀 Preview loaded successfully', 'success')}
              onError={() => addToConsole('❌ Preview failed to load', 'error')}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No preview available</p>
          <p className="text-sm">Generate files using the chat to see preview</p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-[var(--replit-border)]">
        {tabs.map(tab => (
          <Button
            key={tab.id}
            variant="ghost"
            className={`flex-1 py-3 px-4 text-sm font-medium rounded-none border-b-2 border-transparent transition-colors ${
              activeTab === tab.id
                ? 'tab-button active bg-[var(--replit-hover)] border-[var(--replit-accent)]'
                : 'hover:bg-[var(--replit-hover)]'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon className="mr-2 h-4 w-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'preview' && (
          <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden">
            {isGenerating && liveCoding.isActive ? (
              // Live Coding View
              <div className="h-full flex flex-col">
                <div className="p-4 border-b border-gray-700">
                  <div className="flex items-center space-x-2 mb-2">
                    <Code className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-mono text-green-400">Generating Code</span>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-ping" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-ping" style={{animationDelay: '0.4s'}}></div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <FileText className="w-3 h-3 text-blue-400" />
                    <span className="text-xs font-mono text-blue-400">{liveCoding.fileName}</span>
                  </div>
                  <Progress value={liveCoding.progress} className="h-1" />
                </div>

                <div className="flex-1 p-4 overflow-y-auto">
                  <div className="bg-gray-800 rounded-lg p-4 h-full">
                    <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap overflow-auto">
                      {liveCoding.content}
                      <span className="animate-pulse">█</span>
                    </pre>
                  </div>
                </div>

                <div className="p-4 border-t border-gray-700">
                  <div className="flex items-center space-x-2 text-yellow-400">
                    <Zap className="w-4 h-4" />
                    <span className="text-xs">AI is writing your code...</span>
                  </div>
                </div>
              </div>
            ) : showPreview && previewContent ? (
              // Preview View
              <div className="h-full flex flex-col">
                <div className="p-3 border-b border-gray-700 bg-gray-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Monitor className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium text-white">Live Preview</span>
                      <Badge variant="secondary" className="text-xs bg-green-600 text-white">
                        Ready
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefreshPreview}
                      className="text-xs h-6 px-2"
                    >
                      Refresh
                    </Button>
                  </div>
                </div>

                <div className="flex-1 bg-white">
                  <iframe
                    id="preview-iframe"
                    srcDoc={previewContent}
                    className="w-full h-full border-0"
                    title="Live Preview"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                  />
                </div>
              </div>
            ) : (
              // Empty State
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center mb-4 mx-auto">
                    <Eye className="w-8 h-8 text-gray-600" />
                  </div>
                  <h3 className="text-lg font-medium mb-2 text-white">Preview Panel</h3>
                  <p className="text-sm">Start a conversation to see live coding and preview</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'console' && (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-[var(--replit-border)]">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Console</h3>
                <Button variant="ghost" size="icon" onClick={handleClearConsole}>
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto font-mono text-sm space-y-1">
              {consoleOutput.map((entry, index) => (
                <div
                  key={index}
                  className={`${
                    entry.type === 'success' ? 'text-green-400' :
                    entry.type === 'error' ? 'text-red-400' :
                    'text-[var(--replit-text-dim)]'
                  }`}
                >
                  <span className="text-[var(--replit-text-dim)]">[{entry.timestamp}]</span> {entry.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <ChatInterface 
            project={project}
            onConsoleLog={addToConsole}
          />
        )}
      </div>
    </div>
  );
}