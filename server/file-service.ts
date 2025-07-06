import fs from "node:fs/promises";
import path from "node:path";
import { FileToolResult } from "./gemini-tools";

// Safe workspace for AI-generated projects
const WORKSPACE_ROOT = path.join(process.cwd(), "ai-workspace");

export class FileService {
  private workspaceRoot: string;
  private projectId: string;

  constructor(workspaceId?: string) {
    // Each project gets its own isolated workspace
    this.workspaceRoot = workspaceId
      ? path.join(WORKSPACE_ROOT, workspaceId)
      : path.join(WORKSPACE_ROOT, "default");
    this.projectId = workspaceId || "default";
  }

  // Ensure the workspace directory exists
  private async ensureWorkspace() {
    try {
      await fs.mkdir(this.workspaceRoot, { recursive: true });
    } catch (error) {
      // Directory might already exist, that's fine
    }
  }

  // Safely resolve file paths within workspace
  private resolvePath(relativePath: string): string {
    const resolved = path.resolve(this.workspaceRoot, relativePath);

    // Security check: ensure path is within workspace
    if (!resolved.startsWith(this.workspaceRoot)) {
      throw new Error(`Path traversal detected: ${relativePath}`);
    }

    return resolved;
  }

  async createFile(filePath: string, content: string): Promise<FileToolResult> {
    try {
      await this.ensureWorkspace();

      const fullPath = this.resolvePath(filePath);
      const directory = path.dirname(fullPath);

      // Ensure directory exists
      await fs.mkdir(directory, { recursive: true });

      // Write file
      await fs.writeFile(fullPath, content, "utf8");

      // Also store in preview system for immediate access
      this.storeFileForPreview(filePath, content);

      console.log(`📄 Created file: ${filePath} (${content.length} bytes)`);
      return {
        status: 'success',
        message: `Created file: ${filePath}`,
        data: { path: filePath, size: content.length, content: content.substring(0, 200) + '...' }
      };
    } catch (error) {
      console.error(`Failed to create file ${filePath}:`, error);
      return {
        status: 'error',
        message: `Failed to create file: ${error}`
      };
    }
  }

  // Store file for preview system
  private storeFileForPreview(path: string, content: string) {
    try {
      // Import preview store function
      const { storePreview } = require('./preview-store');

      // Create a simple preview entry
      const files = { [path]: { content, language: this.getLanguageFromPath(path) } };
      storePreview(this.projectId, files);
    } catch (error) {
      console.log('Preview store not available:', error.message);
    }
  }

  private getLanguageFromPath(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      'html': 'html',
      'css': 'css',
      'js': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'jsx': 'javascript',
      'py': 'python',
      'json': 'json',
      'md': 'markdown'
    };
    return langMap[ext || ''] || 'text';
  }

  // Update existing file with new content
  async updateFile(filePath: string, content: string): Promise<FileToolResult> {
    try {
      await this.ensureWorkspace();

      const fullPath = this.resolvePath(filePath);

      // Check if file exists
      try {
        await fs.access(fullPath);
      } catch {
        return {
          status: 'error',
          message: `File ${filePath} does not exist. Use create_file instead.`
        };
      }

      // Update file
      await fs.writeFile(fullPath, content, "utf8");

      console.log(`📝 Updated file: ${filePath}`);

      return {
        status: 'success',
        message: `Updated ${filePath}`,
        data: { path: filePath, size: content.length }
      };
    } catch (error) {
      console.error(`Error updating file ${filePath}:`, error);
      return {
        status: 'error',
        message: `Failed to update ${filePath}: ${error}`
      };
    }
  }

  // Read file contents
  async readFile(filePath: string, maxBytes: number = 8000): Promise<FileToolResult> {
    try {
      const fullPath = this.resolvePath(filePath);

      // Check if file exists
      try {
        await fs.access(fullPath);
      } catch {
        return {
          status: 'error',
          message: `File ${filePath} does not exist`
        };
      }

      // Read file (with size limit)
      const buffer = await fs.readFile(fullPath);
      const content = buffer.slice(0, maxBytes).toString("utf8");

      const truncated = buffer.length > maxBytes;

      return {
        status: 'success',
        message: `Read ${filePath}${truncated ? ' (truncated)' : ''}`,
        data: {
          content,
          size: buffer.length,
          truncated,
          path: filePath
        }
      };
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return {
        status: 'error',
        message: `Failed to read ${filePath}: ${error}`
      };
    }
  }

  // List directory contents
  async listDirectory(dirPath: string = "."): Promise<FileToolResult> {
    try {
      await this.ensureWorkspace();

      const fullPath = this.resolvePath(dirPath);

      try {
        const items = await fs.readdir(fullPath, { withFileTypes: true });

        const files: string[] = [];
        const directories: string[] = [];

        for (const item of items) {
          if (item.isFile()) {
            files.push(item.name);
          } else if (item.isDirectory()) {
            directories.push(item.name);
          }
        }

        return {
          status: 'success',
          message: `Listed directory ${dirPath}`,
          data: {
            path: dirPath,
            files: files.sort(),
            directories: directories.sort(),
            total: files.length + directories.length
          }
        };
      } catch {
        return {
          status: 'error',
          message: `Directory ${dirPath} does not exist`
        };
      }
    } catch (error) {
      console.error(`Error listing directory ${dirPath}:`, error);
      return {
        status: 'error',
        message: `Failed to list directory ${dirPath}: ${error}`
      };
    }
  }

  // Create directory
  async createFolder(dirPath: string): Promise<FileToolResult> {
    try {
      await this.ensureWorkspace();

      const fullPath = this.resolvePath(dirPath);

      await fs.mkdir(fullPath, { recursive: true });

      console.log(`📁 Created folder: ${dirPath}`);

      return {
        status: 'success',
        message: `Created folder ${dirPath}`,
        data: { path: dirPath }
      };
    } catch (error) {
      console.error(`Error creating folder ${dirPath}:`, error);
      return {
        status: 'error',
        message: `Failed to create folder ${dirPath}: ${error}`
      };
    }
  }

  // Get all files for project manifest (used by Gemini for context)
  async getProjectManifest(): Promise<Record<string, any>> {
    try {
      await this.ensureWorkspace();

      const manifest: Record<string, any> = {};

      const scanDirectory = async (relativePath: string = "") => {
        const currentPath = relativePath ? this.resolvePath(relativePath) : this.workspaceRoot;

        try {
          const items = await fs.readdir(currentPath, { withFileTypes: true });

          for (const item of items) {
            const itemRelativePath = relativePath ? `${relativePath}/${item.name}` : item.name;

            if (item.isFile()) {
              try {
                const content = await fs.readFile(path.join(currentPath, item.name), "utf8");
                manifest[itemRelativePath] = {
                  content,
                  type: this.getFileType(item.name),
                  size: content.length
                };
              } catch (error) {
                // Skip files that can't be read
              }
            } else if (item.isDirectory()) {
              await scanDirectory(itemRelativePath);
            }
          }
        } catch (error) {
          // Skip directories that can't be read
        }
      };

      await scanDirectory();

      return manifest;
    } catch (error) {
      console.error("Error getting project manifest:", error);
      return {};
    }
  }

  // Get file type based on extension
  private getFileType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();

    const typeMap: Record<string, string> = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.json': 'json',
      '.md': 'markdown',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.go': 'go',
      '.rs': 'rust',
      '.php': 'php',
      '.rb': 'ruby',
      '.vue': 'vue',
      '.svelte': 'svelte'
    };

    return typeMap[ext] || 'text';
  }

  // Get workspace path for external access (preview server, etc.)
  getWorkspacePath(): string {
    return this.workspaceRoot;
  }
}

// Create a default file service instance
export const fileService = new FileService();

// Function to create project-specific file service
export function createProjectFileService(projectId: string): FileService {
  return new FileService(projectId);
}