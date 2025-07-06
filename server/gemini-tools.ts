// Gemini File Tool Definitions - Battle-tested pattern for AI-powered IDE
export const geminiFileTools = [
  {
    name: "create_file",
    description: "Create a new text file (overwrites if exists)",
    parameters: {
      type: "object",
      properties: {
        path: { 
          type: "string", 
          description: "Relative Unix path like 'src/App.tsx' or 'package.json'" 
        },
        content: { 
          type: "string", 
          description: "UTF-8 source code or file content" 
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "update_file",
    description: "Update an existing file with new content or apply a patch",
    parameters: {
      type: "object",
      properties: {
        path: { 
          type: "string",
          description: "Relative path to the file to update"
        },
        content: { 
          type: "string", 
          description: "Complete new file content (replaces entire file)" 
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "read_file",
    description: "Read file contents to provide context for further edits",
    parameters: {
      type: "object",
      properties: {
        path: { 
          type: "string",
          description: "Relative path to the file to read"
        },
        max_bytes: { 
          type: "integer", 
          default: 8000,
          description: "Maximum bytes to read from file"
        },
      },
      required: ["path"],
    },
  },
  {
    name: "list_directory",
    description: "List files and folders in a directory",
    parameters: {
      type: "object",
      properties: { 
        path: { 
          type: "string",
          description: "Directory path to list (use '.' for root)",
          default: "."
        }
      },
      required: ["path"],
    },
  },
  {
    name: "create_folder",
    description: "Create a new directory/folder",
    parameters: {
      type: "object",
      properties: {
        path: { 
          type: "string", 
          description: "Directory path to create like 'src/components'" 
        },
      },
      required: ["path"],
    },
  }
] as const;

export type GeminiFileToolName = typeof geminiFileTools[number]['name'];

export interface FileToolResult {
  status: 'success' | 'error';
  message: string;
  data?: any;
}

// Implementation functions for file operations
import fs from 'fs/promises';
import path from 'path';

const AI_WORKSPACE = path.join(process.cwd(), 'ai-workspace');

export async function createFile(projectId: string, filename: string, content: string): Promise<FileToolResult> {
  try {
    const projectDir = path.join(AI_WORKSPACE, projectId);
    await fs.mkdir(projectDir, { recursive: true });
    
    const filePath = path.join(projectDir, filename);
    const fileDir = path.dirname(filePath);
    await fs.mkdir(fileDir, { recursive: true });
    
    await fs.writeFile(filePath, content, 'utf-8');
    
    return {
      status: 'success',
      message: `File ${filename} created successfully`,
      data: { filename, size: content.length }
    };
  } catch (error) {
    return {
      status: 'error',
      message: `Failed to create file ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function listFiles(projectId: string): Promise<FileToolResult> {
  try {
    const projectDir = path.join(AI_WORKSPACE, projectId);
    
    async function getFiles(dir: string, baseDir: string = ''): Promise<string[]> {
      const files: string[] = [];
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.join(baseDir, entry.name);
          
          if (entry.isDirectory()) {
            const subFiles = await getFiles(fullPath, relativePath);
            files.push(...subFiles);
          } else {
            files.push(relativePath);
          }
        }
      } catch (error) {
        // Directory doesn't exist or is empty
      }
      return files;
    }
    
    const files = await getFiles(projectDir);
    
    return {
      status: 'success',
      message: `Found ${files.length} files`,
      data: { files }
    };
  } catch (error) {
    return {
      status: 'error',
      message: `Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}