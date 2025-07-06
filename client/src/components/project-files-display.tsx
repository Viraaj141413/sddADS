
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

interface ProjectFile {
  path: string;
  content: string;
  language: string;
  size: number;
}

interface ProjectFilesDisplayProps {
  projectId: string;
  isVisible: boolean;
}

export function ProjectFilesDisplay({ projectId, isVisible }: ProjectFilesDisplayProps) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isVisible && projectId) {
      fetchProjectFiles();
    }
  }, [projectId, isVisible]);

  const fetchProjectFiles = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/project-files/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      }
    } catch (error) {
      console.error('Failed to fetch project files:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (language: string) => {
    const icons: Record<string, string> = {
      'html': '🌐',
      'css': '🎨',
      'javascript': '⚡',
      'typescript': '📘',
      'json': '📋',
      'markdown': '📝',
      'python': '🐍'
    };
    return icons[language] || '📄';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isVisible || files.length === 0) {
    return null;
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📁 Project Files
          <Badge variant="secondary">{files.length} files</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
              <div className="flex items-center gap-2">
                <span className="text-lg">{getFileIcon(file.language)}</span>
                <span className="font-mono text-sm">{file.path}</span>
                <Badge variant="outline" className="text-xs">
                  {file.language.toUpperCase()}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {formatFileSize(file.size)}
              </div>
            </div>
          ))}
          
          <Separator className="my-3" />
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/api/preview-files/${projectId}`, '_blank')}
            >
              🔍 Preview App
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchProjectFiles}
              disabled={loading}
            >
              {loading ? '🔄 Refreshing...' : '🔄 Refresh'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
