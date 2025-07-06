import { useState, useCallback } from 'react';
import { Project, FileContent, createDefaultProject } from '@/lib/file-system';

export const useProject = () => {
  const [project, setProject] = useState<Project | null>(null);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [openFiles, setOpenFiles] = useState<string[]>(['index.html']);

  const createProject = useCallback((name: string, description?: string) => {
    const newProject = createDefaultProject(name);
    if (description) {
      // Store the description for AI context
      localStorage.setItem('projectDescription', description);
    }
    setProject(newProject);
    setActiveFile(Object.keys(newProject.files)[0]);
    return newProject;
  }, []);

  const updateFileContent = useCallback((fileName: string, content: string) => {
    if (!project) return;
    setProject(prev => ({
      ...prev!,
      files: {
        ...prev!.files,
        [fileName]: {
          ...prev!.files[fileName],
          content
        }
      }
    }));
  }, [project]);

  const createFile = useCallback((fileName: string, content: string = '', type: string = 'text') => {
    if (!project || project.files[fileName]) return;
    setProject(prev => ({
      ...prev!,
      files: {
        ...prev!.files,
        [fileName]: { content, type }
      }
    }));
  }, [project]);

  const deleteFile = useCallback((fileName: string) => {
    if (!project || !project.files[fileName]) return;
    setProject(prev => {
      const newFiles = { ...prev!.files };
      delete newFiles[fileName];
      return { ...prev!, files: newFiles };
    });
    setOpenFiles(prev => prev.filter(f => f !== fileName));
    if (activeFile === fileName) {
      const remainingFiles = Object.keys(project.files).filter(f => f !== fileName);
      setActiveFile(remainingFiles[0] || null);
    }
  }, [project, activeFile]);

  const openFile = useCallback((fileName: string) => {
    if (!openFiles.includes(fileName)) {
      setOpenFiles(prev => [...prev, fileName]);
    }
    setActiveFile(fileName);
  }, [openFiles]);

  const closeFile = useCallback((fileName: string) => {
    setOpenFiles(prev => prev.filter(f => f !== fileName));
    if (activeFile === fileName) {
      const remainingFiles = openFiles.filter(f => f !== fileName);
      setActiveFile(remainingFiles[0] || null);
    }
  }, [activeFile, openFiles]);

  return {
    project,
    activeFile,
    openFiles,
    createProject,
    updateFileContent,
    createFile,
    deleteFile,
    openFile,
    closeFile,
    setActiveFile
  };
};
