
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Slider } from './ui/slider';
import { Checkbox } from './ui/checkbox';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { LoadingAnimation } from './ui/loading-animation';

interface GenerationStats {
  totalFiles: number;
  totalLines: number;
  totalSize: number;
  fileTypes: string[];
}

interface GeneratedFile {
  content: string;
  language: string;
  lines: number;
  size: number;
}

export function AdvancedFileGenerator() {
  const [prompt, setPrompt] = useState('');
  const [fileCount, setFileCount] = useState([8]);
  const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>([
    'html', 'css', 'js', 'tsx'
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState('');
  const [generatedFiles, setGeneratedFiles] = useState<Record<string, GeneratedFile>>({});
  const [stats, setStats] = useState<GenerationStats | null>(null);

  const fileTypeOptions = [
    { id: 'html', label: 'HTML', color: 'bg-orange-500' },
    { id: 'css', label: 'CSS', color: 'bg-blue-500' },
    { id: 'js', label: 'JavaScript', color: 'bg-yellow-500' },
    { id: 'ts', label: 'TypeScript', color: 'bg-blue-600' },
    { id: 'jsx', label: 'React JSX', color: 'bg-cyan-500' },
    { id: 'tsx', label: 'React TSX', color: 'bg-cyan-600' },
    { id: 'py', label: 'Python', color: 'bg-green-600' },
    { id: 'json', label: 'JSON', color: 'bg-gray-500' },
    { id: 'md', label: 'Markdown', color: 'bg-purple-500' },
    { id: 'scss', label: 'SCSS', color: 'bg-pink-500' }
  ];

  const handleFileTypeToggle = (fileType: string) => {
    setSelectedFileTypes(prev =>
      prev.includes(fileType)
        ? prev.filter(type => type !== fileType)
        : [...prev, fileType]
    );
  };

  const generateFiles = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setProgress(0);
    setGeneratedFiles({});
    setStats(null);

    try {
      const response = await fetch('/api/generate/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          fileCount: fileCount[0],
          fileTypes: selectedFileTypes
        }),
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              setProgress(data.progress || 0);
              setCurrentStage(data.message || '');

              if (data.stage === 'complete' && data.result) {
                setGeneratedFiles(data.result.files);
                setStats(data.result.stats);
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Generation failed:', error);
      setCurrentStage('❌ Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🚀 Advanced File Generator
            <Badge variant="secondary">AI-Powered</Badge>
          </CardTitle>
          <CardDescription>
            Generate multiple high-quality, production-ready code files with advanced AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Prompt Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">What do you want to build?</label>
            <Textarea
              placeholder="e.g., A modern e-commerce website with React, TypeScript, and beautiful animations..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* File Count Slider */}
          <div className="space-y-3">
            <label className="text-sm font-medium">
              Number of Files: <Badge variant="outline">{fileCount[0]}</Badge>
            </label>
            <Slider
              value={fileCount}
              onValueChange={setFileCount}
              min={3}
              max={20}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>3 files</span>
              <span>20 files</span>
            </div>
          </div>

          {/* File Types Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">File Types to Generate</label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {fileTypeOptions.map((fileType) => (
                <div key={fileType.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={fileType.id}
                    checked={selectedFileTypes.includes(fileType.id)}
                    onCheckedChange={() => handleFileTypeToggle(fileType.id)}
                  />
                  <label
                    htmlFor={fileType.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    <Badge className={`${fileType.color} text-white`}>
                      {fileType.label}
                    </Badge>
                  </label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Selected: {selectedFileTypes.length} file types
            </p>
          </div>

          {/* Generate Button */}
          <Button
            onClick={generateFiles}
            disabled={!prompt.trim() || selectedFileTypes.length === 0 || isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <LoadingAnimation />
                Generating Files...
              </>
            ) : (
              `🚀 Generate ${fileCount[0]} Professional Files`
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generation Progress */}
      {isGenerating && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Generation Progress</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground">{currentStage}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generation Results */}
      {stats && Object.keys(generatedFiles).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ✅ Generation Complete
              <Badge variant="default">{stats.totalFiles} Files</Badge>
            </CardTitle>
            <CardDescription>
              Successfully generated {stats.totalFiles} professional code files
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalFiles}</div>
                <div className="text-xs text-muted-foreground">Total Files</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.totalLines.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Lines of Code</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{formatFileSize(stats.totalSize)}</div>
                <div className="text-xs text-muted-foreground">Total Size</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.fileTypes.length}</div>
                <div className="text-xs text-muted-foreground">File Types</div>
              </div>
            </div>

            <Separator />

            {/* File List */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Generated Files</h4>
              <div className="grid gap-2 max-h-60 overflow-y-auto">
                {Object.entries(generatedFiles).map(([filename, file]) => (
                  <div key={filename} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {file.language.toUpperCase()}
                      </Badge>
                      <span className="text-sm font-mono">{filename}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{file.lines} lines</span>
                      <span>{formatFileSize(file.size)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview Button */}
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.open('/preview/index.html', '_blank')}
            >
              🔍 Preview Generated Application
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
