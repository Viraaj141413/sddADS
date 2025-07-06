export interface FileContent {
  content: string;
  type: string;
}

export interface Project {
  name: string;
  files: Record<string, FileContent>;
}

export const getFileIcon = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'html': return 'file-code';
    case 'css': return 'palette';
    case 'js': case 'jsx': case 'ts': case 'tsx': return 'brand-javascript';
    case 'json': return 'braces';
    case 'md': return 'file-text';
    case 'py': return 'brand-python';
    case 'vue': return 'brand-vue';
    default: return 'file';
  }
};

export const createDefaultProject = (name: string): Project => ({
  name,
  files: {}
});
