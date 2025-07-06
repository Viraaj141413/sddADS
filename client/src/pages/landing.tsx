
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { 
  SparklesIcon, 
  UserIcon, 
  LogOutIcon,
  BriefcaseIcon, 
  FolderIcon,
  CodeIcon,
  GlobeIcon,
  SmartphoneIcon,
  ZapIcon,
  RocketIcon,
  BrainIcon,
  Lightbulb
} from 'lucide-react';
import { AuthModal } from '@/components/auth-modal';

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

interface LandingPageProps {
  onCreateApp: (prompt: string, type: string) => void;
}

export function LandingPage({ onCreateApp }: LandingPageProps) {
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [recentApps, setRecentApps] = useState<RecentApp[]>([]);

  const quickStarters = [
    'Calculator with advanced functions',
    'Personal portfolio website',
    'Todo app with dark mode',
    'Weather dashboard',
    'Image gallery with filters',
    'Chat application',
    'E-commerce product page',
    'Data visualization dashboard'
  ];

  const features = [
    {
      icon: BrainIcon,
      title: 'Intelligent Analysis',
      description: 'I analyze your ideas and determine the perfect tech stack and architecture',
      gradient: 'from-purple-500 to-blue-500'
    },
    {
      icon: ZapIcon,
      title: 'Advanced Code Generation',
      description: 'Generate production-ready, sophisticated code with modern best practices',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Lightbulb,
      title: 'Natural Conversation',
      description: 'Chat naturally while I build amazing applications in the background',
      gradient: 'from-orange-500 to-red-500'
    },
    {
      icon: RocketIcon,
      title: 'Complete Projects',
      description: 'Full file structures with everything you need - no half-finished demos',
      gradient: 'from-green-500 to-emerald-500'
    }
  ];

  useEffect(() => {
    checkAuth();
    if (user) {
      loadRecentApps();
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  };

  const loadRecentApps = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/viraaj/user-projects?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.projects) {
          const recentProjects = data.projects.map((project: any) => ({
            id: project.id || Date.now().toString(),
            name: project.name || 'Untitled App',
            description: project.description || 'No description available',
            type: project.type || 'general',
            createdAt: project.createdAt || new Date().toISOString(),
            isPublic: true
          }));
          setRecentApps(recentProjects.slice(0, 6));
        }
      }
    } catch (error) {
      console.error('Failed to load recent apps:', error);
    }
  };

  const handleAuth = (userData: User) => {
    setUser(userData);
    setShowAuthModal(false);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/viraaj/logout', { method: 'POST' });
      setUser(null);
      setRecentApps([]);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleQuickStartClick = (quickStart: string) => {
    setInputValue(quickStart);
  };

  const handleSubmit = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (!inputValue.trim()) return;

    onCreateApp(inputValue, 'general');
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-white flex flex-col">
      {/* Header */}
      <div className="bg-[#161b22] border-b border-gray-700 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <SparklesIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold">Peaks AI</span>
              <div className="text-xs text-gray-400">Powered by Gemini 2.5 Flash</div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {user ? (
              <>
                <div className="flex items-center space-x-2 text-sm">
                  <UserIcon className="w-4 h-4" />
                  <span>Hi, {user.name}</span>
                </div>
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                >
                  <LogOutIcon className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setShowAuthModal(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Sign in
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-4xl space-y-12">
          {/* Main Heading */}
          <div className="text-center space-y-6">
            <motion.h1 
              className="text-5xl font-bold text-white leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              Hey {user ? user.name : 'there'}, what do you want to{' '}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                build today?
              </span>
            </motion.h1>
            
            <motion.p 
              className="text-xl text-gray-300 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              I'm your AI development partner. I analyze your ideas, chat naturally about your project, 
              and create sophisticated, production-ready applications with complete file structures.
            </motion.p>
          </div>

          {/* Input Section */}
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="relative">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Describe anything you want to build... I'll analyze it, plan the best approach, and create amazing code!"
                className="w-full min-h-[140px] bg-[#21262d] border-gray-600 text-white placeholder-gray-400 resize-none text-lg p-6 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              <div className="absolute bottom-4 left-4 text-sm text-gray-500 flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  <BrainIcon className="w-4 h-4" />
                  <span>Intelligent Analysis</span>
                </div>
                <span>•</span>
                <div className="flex items-center space-x-1">
                  <CodeIcon className="w-4 h-4" />
                  <span>Advanced Generation</span>
                </div>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!inputValue.trim()}
                className="absolute bottom-4 right-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8 py-2 text-white font-medium"
              >
                <RocketIcon className="w-4 h-4 mr-2" />
                Let's Build!
              </Button>
            </div>

            {/* Quick Starters */}
            <div>
              <h3 className="text-lg font-medium text-gray-300 mb-4">Quick starters</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {quickStarters.slice(0, 8).map((starter, index) => (
                  <Button
                    key={index}
                    onClick={() => handleQuickStartClick(starter)}
                    variant="outline"
                    size="sm"
                    className="border-gray-600 hover:border-blue-400 bg-transparent text-gray-300 hover:text-white text-sm py-3 h-auto whitespace-normal text-left justify-start"
                  >
                    {starter}
                  </Button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-[#0d1117] px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-white mb-12">
            Why I'm Different
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card className="bg-[#161b22] border-gray-700 hover:border-gray-600 transition-colors h-full">
                    <CardContent className="p-6">
                      <div className={`w-12 h-12 bg-gradient-to-r ${feature.gradient} rounded-lg flex items-center justify-center mb-4`}>
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                      <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Apps Section */}
      {user && (
        <div className="bg-[#0d1117] px-4 pb-16">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-semibold text-white">Your recent projects</h2>
              <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                View All →
              </Button>
            </div>

            {recentApps.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentApps.map((app) => (
                  <Card key={app.id} className="bg-[#161b22] border-gray-700 hover:border-gray-600 transition-colors cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-sm font-bold">
                            {app.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-medium text-white truncate">{app.name}</h3>
                            <p className="text-sm text-gray-400">{new Date(app.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-gray-400">Live</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-300 line-clamp-2">{app.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <FolderIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No projects yet. Let's build something amazing!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuth}
      />
    </div>
  );
}
