/**
 * File Transfer Utilities
 *
 * Handles file uploads and downloads for web mode.
 * Provides progress tracking and error handling.
 */

export interface FileUploadOptions {
  /** File to upload */
  file: File;
  /** Destination path on server */
  destinationPath: string;
  /** Upload progress callback (0-100) */
  onProgress?: (progress: number) => void;
  /** Base URL of the server */
  serverUrl: string;
  /** Optional workspace ID */
  workspaceId?: string;
}

export interface FileDownloadOptions {
  /** Path of file on server */
  filePath: string;
  /** Download progress callback (0-100) */
  onProgress?: (progress: number) => void;
  /** Base URL of the server */
  serverUrl: string;
  /** Optional workspace ID */
  workspaceId?: string;
  /** Save as filename (defaults to basename of filePath) */
  saveAs?: string;
}

export interface BatchUploadOptions {
  /** Files to upload */
  files: File[];
  /** Destination directory on server */
  destinationDir: string;
  /** Overall progress callback (0-100) */
  onProgress?: (progress: number) => void;
  /** Per-file progress callback */
  onFileProgress?: (fileName: string, progress: number) => void;
  /** Base URL of the server */
  serverUrl: string;
  /** Optional workspace ID */
  workspaceId?: string;
}

export interface TransferResult {
  success: boolean;
  filePath: string;
  error?: string;
}

/**
 * Upload a single file to the server
 */
export async function uploadFile(options: FileUploadOptions): Promise<TransferResult> {
  const { file, destinationPath, onProgress, serverUrl, workspaceId } = options;

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("destinationPath", destinationPath);
    if (workspaceId) {
      formData.append("workspaceId", workspaceId);
    }

    const xhr = new XMLHttpRequest();

    // Setup progress tracking
    if (onProgress) {
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });
    }

    // Create promise for XHR
    const uploadPromise = new Promise<TransferResult>((resolve, reject) => {
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve({
              success: true,
              filePath: response.filePath || destinationPath,
            });
          } catch {
            resolve({
              success: true,
              filePath: destinationPath,
            });
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Upload failed: Network error"));
      });

      xhr.addEventListener("abort", () => {
        reject(new Error("Upload cancelled"));
      });
    });

    // Start upload
    const endpoint = `${serverUrl}/api/files/upload`;
    xhr.open("POST", endpoint);
    xhr.send(formData);

    return await uploadPromise;
  } catch (error) {
    return {
      success: false,
      filePath: destinationPath,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

/**
 * Download a file from the server
 */
export async function downloadFile(options: FileDownloadOptions): Promise<TransferResult> {
  const { filePath, onProgress, serverUrl, workspaceId, saveAs } = options;

  try {
    const url = new URL(`${serverUrl}/api/files/download`);
    url.searchParams.set("filePath", filePath);
    if (workspaceId) {
      url.searchParams.set("workspaceId", workspaceId);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    // Get total size for progress tracking
    const contentLength = response.headers.get("content-length");
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    // Read response as blob with progress tracking
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body is not readable");
    }

    const chunks: Uint8Array[] = [];
    let loaded = 0;

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      chunks.push(value);
      loaded += value.length;

      if (onProgress && total > 0) {
        const progress = Math.round((loaded / total) * 100);
        onProgress(progress);
      }
    }

    // Combine chunks into blob
    const blob = new Blob(chunks);

    // Trigger browser download
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = saveAs || filePath.split("/").pop() || "download";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);

    return {
      success: true,
      filePath,
    };
  } catch (error) {
    return {
      success: false,
      filePath,
      error: error instanceof Error ? error.message : "Download failed",
    };
  }
}

/**
 * Upload multiple files to the server
 */
export async function uploadFiles(options: BatchUploadOptions): Promise<TransferResult[]> {
  const { files, destinationDir, onProgress, onFileProgress, serverUrl, workspaceId } = options;

  const results: TransferResult[] = [];
  let completed = 0;

  for (const file of files) {
    const destinationPath = `${destinationDir}/${file.name}`;

    const result = await uploadFile({
      file,
      destinationPath,
      serverUrl,
      workspaceId,
      onProgress: onFileProgress
        ? (progress) => onFileProgress(file.name, progress)
        : undefined,
    });

    results.push(result);
    completed++;

    if (onProgress) {
      const overallProgress = Math.round((completed / files.length) * 100);
      onProgress(overallProgress);
    }
  }

  return results;
}

/**
 * Read a file from the user's local file system (browser)
 */
export async function pickAndReadFile(options?: {
  accept?: string;
  multiple?: boolean;
}): Promise<File[]> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    if (options?.accept) {
      input.accept = options.accept;
    }
    if (options?.multiple) {
      input.multiple = true;
    }

    input.addEventListener("change", () => {
      const files = Array.from(input.files || []);
      if (files.length === 0) {
        reject(new Error("No files selected"));
      } else {
        resolve(files);
      }
    });

    input.addEventListener("cancel", () => {
      reject(new Error("File selection cancelled"));
    });

    input.click();
  });
}

/**
 * Read file content as text
 */
export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

/**
 * Read file content as data URL (base64)
 */
export async function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Read file content as array buffer
 */
export async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Create a file from text content and trigger download
 */
export function downloadTextAsFile(content: string, filename: string, mimeType = "text/plain") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Check if File System Access API is available
 */
export function hasFileSystemAccess(): boolean {
  return (
    typeof window !== "undefined" &&
    "showOpenFilePicker" in window &&
    "showSaveFilePicker" in window &&
    "showDirectoryPicker" in window
  );
}

/**
 * Pick a file using File System Access API (Chrome 86+)
 */
export async function pickFileHandle(options?: {
  types?: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
  multiple?: boolean;
}): Promise<FileSystemFileHandle[]> {
  if (!hasFileSystemAccess()) {
    throw new Error("File System Access API not supported");
  }

  const pickerOpts: any = {
    types: options?.types,
    multiple: options?.multiple ?? false,
  };

  const handles = await (window as any).showOpenFilePicker(pickerOpts);
  return handles;
}

/**
 * Pick a directory using File System Access API
 */
export async function pickDirectoryHandle(): Promise<FileSystemDirectoryHandle> {
  if (!hasFileSystemAccess()) {
    throw new Error("File System Access API not supported");
  }

  const handle = await (window as any).showDirectoryPicker({
    mode: "readwrite",
  });
  return handle;
}

/**
 * Save a file using File System Access API
 */
export async function saveFileHandle(
  content: string | Blob,
  options?: {
    suggestedName?: string;
    types?: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }
): Promise<void> {
  if (!hasFileSystemAccess()) {
    throw new Error("File System Access API not supported");
  }

  const pickerOpts: any = {
    suggestedName: options?.suggestedName,
    types: options?.types,
  };

  const handle = await (window as any).showSaveFilePicker(pickerOpts);
  const writable = await handle.createWritable();

  if (typeof content === "string") {
    await writable.write(content);
  } else {
    await writable.write(content);
  }

  await writable.close();
}
