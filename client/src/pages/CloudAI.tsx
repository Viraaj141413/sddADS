import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  SparklesIcon, 
  UserIcon, 
  LogOutIcon, 
  CheckIcon, 
  BriefcaseIcon, 
  HeartIcon, 
  FolderIcon,
  ArrowRightIcon,
  CodeIcon,
  DatabaseIcon,
  GlobeIcon,
  SmartphoneIcon,
  ZapIcon,
  RocketIcon,
  TrendingUpIcon,
  PlayIcon,
  PlusIcon,
  StarIcon,
  ClockIcon,
  BrainIcon,
  LayersIcon,
  ShieldIcon,
  CloudIcon,
  TerminalIcon,
  PaletteIcon,
  ActivityIcon,
  BoxIcon
} from 'lucide-react';
import { AuthModal } from '@/components/auth-modal';
import { ChatInterface } from '@/components/cloud-chat';

interface User {
  id: string;
  name: string;
  email: string;
}

interface RecentApp {
  id: string;
  name: string;
  description: string;
  type: string;
  createdAt: string;
  isPublic: boolean;
}

export function CloudAI() {
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [recentApps, setRecentApps] = useState<RecentApp[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      loadRecentApps();
    }
  };

  const loadRecentApps = async () => {
    try {
      const response = await fetch('/api/viraaj/user-projects');
      if (response.ok) {
        const data = await response.json();
        setRecentApps(data.projects || []);
      }
    } catch (error) {
      console.error('Failed to load recent apps:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('deviceId');
    setUser(null);
    setRecentApps([]);
  };

  const projectTemplates = [
    { 
      id: 'webapp', 
      label: 'Web Application', 
      icon: GlobeIcon, 
      description: 'Full-stack web applications',
      prompt: 'Create a modern web application with user authentication, database integration, and responsive design',
      gradient: 'from-blue-500 to-cyan-500',
      featured: true
    },
    { 
      id: 'mobile', 
      label: 'Mobile App', 
      icon: SmartphoneIcon, 
      description: 'Mobile-first experiences',
      prompt: 'Build a mobile-responsive app with touch interfaces, progressive web app features, and offline capabilities',
      gradient: 'from-purple-500 to-pink-500',
      featured: true
    },
    { 
      id: 'api', 
      label: 'API & Backend', 
      icon: DatabaseIcon, 
      description: 'Server-side applications',
      prompt: 'Create a RESTful API with database connections, authentication, and comprehensive endpoints',
      gradient: 'from-green-500 to-emerald-500',
      featured: true
    },
    { 
      id: 'dashboard', 
      label: 'Analytics Dashboard', 
      icon: TrendingUpIcon, 
      description: 'Data visualization',
      prompt: 'Build an analytics dashboard with real-time charts, data tables, and interactive visualizations',
      gradient: 'from-orange-500 to-red-500',
      featured: true
    },
    { 
      id: 'game', 
      label: 'Game', 
      icon: PlayIcon, 
      description: 'Interactive games',
      prompt: 'Create an interactive browser game with engaging mechanics, animations, and score tracking',
      gradient: 'from-pink-500 to-rose-500'
    },
    { 
      id: 'tool', 
      label: 'Developer Tool', 
      icon: TerminalIcon, 
      description: 'Productivity tools',
      prompt: 'Build a developer utility tool with code processing, file manipulation, or automation features',
      gradient: 'from-gray-600 to-slate-600'
    },
    { 
      id: 'ecommerce', 
      label: 'E-commerce', 
      icon: BriefcaseIcon, 
      description: 'Online stores',
      prompt: 'Create an e-commerce platform with product catalog, shopping cart, and payment integration',
      gradient: 'from-amber-500 to-yellow-500'
    },
    { 
      id: 'ai', 
      label: 'AI/ML App', 
      icon: BrainIcon, 
      description: 'AI-powered apps',
      prompt: 'Build an AI-powered application with machine learning models, natural language processing, or computer vision',
      gradient: 'from-indigo-500 to-purple-500'
    }
  ];

  const handleCreateApp = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (!inputValue.trim()) {
      return;
    }

    setShowChat(true);
  };

  const handleTemplateClick = (template: any) => {
    setInputValue(template.prompt);
    setSelectedTags([template.id]);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  if (showChat && user) {
    return (
      <div className="h-screen bg-gray-900 flex flex-col">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 px-4 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <SparklesIcon className="h-6 w-6 text-purple-500" />
            <span className="text-lg font-semibold text-white">CloudAI</span>
            <Badge variant="secondary" className="bg-purple-900/50 text-purple-300 text-xs">
              Powered by Gemini
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowChat(false)}
            className="text-gray-400 hover:text-white"
          >
            <ArrowRightIcon className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </header>

        {/* Split View Container */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Chat */}
          <div className="w-1/2 border-r border-gray-700">
            <ChatInterface 
              user={user} 
              initialPrompt={inputValue} 
              onProjectIdChange={(projectId) => setActiveProjectId(projectId)}
            />
          </div>

          {/* Right Panel - Preview */}
          <div className="w-1/2 bg-gray-950 flex flex-col">
            <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CodeIcon className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-300">Live Preview</span>
              </div>
              <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white">
                <RocketIcon className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 bg-gray-900">
              {activeProjectId ? (
                <iframe
                  src={`/api/preview-files/${activeProjectId}`}
                  className="w-full h-full border-0"
                  title="Preview"
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                      <CodeIcon className="h-8 w-8 text-gray-600" />
                    </div>
                    <p className="text-gray-400 text-sm">Your app preview will appear here</p>
                    <p className="text-gray-500 text-xs mt-2">Start building with AI to see your creation</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <SparklesIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">CloudAI</span>
              <Badge variant="secondary" className="ml-2 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                Powered by Gemini
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Welcome, <span className="font-semibold">{user.name}</span>
                  </span>
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    <LogOutIcon className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={() => setShowAuthModal(true)}>
                  <UserIcon className="h-4 w-4 mr-2" />
                  Sign in
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-bold text-gray-900 dark:text-white mb-4"
          >
            Build Apps with <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">CloudAI</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto"
          >
            Transform your ideas into production-ready applications with natural language.
            Powered by Gemini's advanced AI for intelligent code generation.
          </motion.p>
        </div>

        {/* Input Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-4xl mx-auto mb-12"
        >
          <Card className="shadow-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <div className="flex flex-col space-y-4">
                <Textarea
                  placeholder="Describe your app idea in natural language..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="min-h-[120px] resize-none bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
                
                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {projectTemplates.slice(0, 4).map((template) => (
                    <Badge
                      key={template.id}
                      variant={selectedTags.includes(template.id) ? "default" : "outline"}
                      className="cursor-pointer transition-all hover:scale-105"
                      onClick={() => toggleTag(template.id)}
                    >
                      <template.icon className="h-3 w-3 mr-1" />
                      {template.label}
                    </Badge>
                  ))}
                </div>

                <Button 
                  size="lg" 
                  onClick={handleCreateApp}
                  disabled={isLoading || !inputValue.trim()}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
                >
                  {isLoading ? (
                    <>
                      <SparklesIcon className="h-5 w-5 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="h-5 w-5 mr-2" />
                      Create App with AI
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Templates Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            Start with a Template
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {projectTemplates.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.05 }}
              >
                <Card
                  className="cursor-pointer transition-all hover:scale-105 hover:shadow-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  onClick={() => handleTemplateClick(template)}
                >
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${template.gradient} flex items-center justify-center mb-4`}>
                      <template.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{template.label}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{template.description}</p>
                    {template.featured && (
                      <Badge variant="secondary" className="mt-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300">
                        <StarIcon className="h-3 w-3 mr-1" />
                        Popular
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Recent Apps Section */}
        {user && recentApps.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
              Your Recent Apps
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentApps.slice(0, 6).map((app, index) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                >
                  <Card className="hover:shadow-lg transition-shadow bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{app.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{app.description}</p>
                        </div>
                        <Badge variant="outline" className="ml-2">
                          {app.type}
                        </Badge>
                      </div>
                      <div className="flex items-center mt-4 text-xs text-gray-500 dark:text-gray-400">
                        <ClockIcon className="h-3 w-3 mr-1" />
                        {new Date(app.createdAt).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </main>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            onSuccess={(userData) => {
              setUser(userData);
              setShowAuthModal(false);
              loadRecentApps();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}