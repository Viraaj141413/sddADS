// Global preview store to persist preview data
export const globalPreviewStore = new Map<string, Record<string, { content: string; language: string }>>();

export function storePreview(projectId: string, files: Record<string, { content: string; language: string }>) {
  globalPreviewStore.set(projectId, files);
  console.log(`Stored preview for ${projectId}, total previews: ${globalPreviewStore.size}`);
}

export function getPreview(projectId: string) {
  const preview = globalPreviewStore.get(projectId);
  console.log(`Getting preview for ${projectId}, found: ${!!preview}`);
  return preview;
}

export function deletePreview(projectId: string) {
  globalPreviewStore.delete(projectId);
}

export function getAllPreviews() {
  return Array.from(globalPreviewStore.keys());
}