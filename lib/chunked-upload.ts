// Chunked upload utility for large file uploads with real-time progress tracking
export interface ChunkedUploadOptions {
  files: File[];
  relativePaths?: string[];
  password?: string;
  maxDownloads?: number;
  chunkSize?: number;
  maxRetries?: number;
  onProgress?: (progress: UploadProgress) => void;
  onChunkProgress?: (fileIndex: number, chunkIndex: number, progress: number) => void;
  onError?: (error: Error) => void;
  onComplete?: (result: UploadResult) => void;
}

export interface UploadProgress {
  overallProgress: number;
  files: FileProgress[];
  uploadedBytes: number;
  totalBytes: number;
  currentFile?: string;
  estimatedTimeRemaining?: number;
  uploadSpeed?: number; // bytes per second
}

export interface FileProgress {
  fileName: string;
  fileSize: number;
  uploadedChunks: number;
  totalChunks: number;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface UploadResult {
  success: boolean;
  downloadUrl?: string;
  editUrl?: string;
  zipId?: string;
  subfiles?: any[];
  error?: string;
}

interface ChunkUploadResult {
  success: boolean;
  chunkIndex: number;
  uploadedChunks: number;
  totalChunks: number;
  progress: number;
  error?: string;
}

export class ChunkedUploader {
  private uploadId: string | null = null;
  private abortController: AbortController | null = null;
  private eventSource: EventSource | null = null;
  private isUploading = false;
  private startTime: number = 0;
  private uploadedBytes = 0;
  private totalBytes = 0;
  private readonly fallbackThreshold: number;

  constructor(
    private options: ChunkedUploadOptions,
    fallbackThreshold = 5 * 1024 * 1024 // 5MB threshold for chunked upload
  ) {
    this.fallbackThreshold = fallbackThreshold;
    this.totalBytes = options.files.reduce((total, file) => total + file.size, 0);
  }

  // Main upload method with fallback logic
  async upload(): Promise<UploadResult> {
    try {
      // Check if we should use chunked upload or fallback to traditional upload
      const shouldUseChunked = this.shouldUseChunkedUpload();
      
      if (!shouldUseChunked) {
        return await this.fallbackUpload();
      }

      return await this.chunkedUpload();
    } catch (error: any) {
      this.options.onError?.(error);
      return { success: false, error: error.message };
    }
  }

  // Determine if chunked upload should be used
  private shouldUseChunkedUpload(): boolean {
    // Use chunked upload for:
    // 1. Files larger than fallback threshold
    // 2. Multiple large files
    // 3. Total size exceeding threshold
    
    const hasLargeFiles = this.options.files.some(file => file.size > this.fallbackThreshold);
    const totalSizeExceedsThreshold = this.totalBytes > this.fallbackThreshold;
    const multipleFiles = this.options.files.length > 3;

    return hasLargeFiles || totalSizeExceedsThreshold || multipleFiles;
  }

  // Fallback to traditional upload for small files
  private async fallbackUpload(): Promise<UploadResult> {
    const formData = new FormData();
    
    this.options.files.forEach((file, index) => {
      formData.append('files', file);
      const relativePath = this.options.relativePaths?.[index] || file.name;
      formData.append('relativePaths', relativePath);
    });

    if (this.options.password) {
      formData.append('password', this.options.password);
    }
    
    formData.append('maxDownloads', String(this.options.maxDownloads || 10));

    // Simulate progress for fallback upload
    let uploadedBytes = 0;
    const totalBytes = this.totalBytes;
    
    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          uploadedBytes = event.loaded;
          const overallProgress = (uploadedBytes / totalBytes) * 100;
          
          this.options.onProgress?.({
            overallProgress,
            files: this.options.files.map((file, index) => ({
              fileName: file.name,
              fileSize: file.size,
              uploadedChunks: overallProgress === 100 ? 1 : 0,
              totalChunks: 1,
              progress: overallProgress,
              status: overallProgress === 100 ? 'completed' : 'uploading'
            })),
            uploadedBytes,
            totalBytes,
            currentFile: this.options.files[0]?.name,
            uploadSpeed: this.calculateUploadSpeed(uploadedBytes),
            estimatedTimeRemaining: this.calculateETA(uploadedBytes, totalBytes)
          });
        }
      });

      xhr.addEventListener('load', async () => {
        if (xhr.status === 200) {
          const result = JSON.parse(xhr.responseText);
          resolve({
            success: true,
            downloadUrl: result.downloadUrl,
            editUrl: result.editUrl,
            zipId: result.zipId,
            subfiles: result.subfiles
          });
        } else {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.error || 'Upload failed'));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.open('POST', '/api/files/upload');
      xhr.send(formData);
    });
  }

  // Main chunked upload implementation
  private async chunkedUpload(): Promise<UploadResult> {
    try {
      this.isUploading = true;
      this.startTime = Date.now();
      this.abortController = new AbortController();

      // Step 1: Initialize upload session
      const initResult = await this.initializeUpload();
      if (!initResult.success) {
        throw new Error(initResult.error || 'Failed to initialize upload');
      }

      // Step 2: Start progress monitoring
      this.startProgressMonitoring();

      // Step 3: Upload chunks for all files concurrently
      await this.uploadAllChunks();

      // Step 4: Complete upload
      const result = await this.completeUpload();
      
      this.cleanup();
      return result;

    } catch (error: any) {
      await this.abortUpload();
      throw error;
    }
  }

  // Initialize upload session
  private async initializeUpload(): Promise<{ success: boolean; error?: string }> {
    const files = this.options.files.map((file, index) => ({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      relativePath: this.options.relativePaths?.[index] || file.name,
    }));

    const response = await fetch('/api/files/upload/chunked?action=init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files,
        password: this.options.password,
        maxDownloads: this.options.maxDownloads || 10,
      }),
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error };
    }

    const data = await response.json();
    this.uploadId = data.uploadId;
    
    return { success: true };
  }

  // Upload chunks for all files with controlled concurrency
  private async uploadAllChunks(): Promise<void> {
    const maxConcurrentUploads = 3; // Limit concurrent chunk uploads
    const chunkSize = this.options.chunkSize || 5 * 1024 * 1024; // 5MB default
    
    // Create upload tasks for all chunks
    const uploadTasks: Array<() => Promise<void>> = [];
    
    for (let fileIndex = 0; fileIndex < this.options.files.length; fileIndex++) {
      const file = this.options.files[fileIndex];
      const totalChunks = Math.ceil(file.size / chunkSize);
      
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        uploadTasks.push(() => this.uploadChunk(file, fileIndex, chunkIndex, chunkSize));
      }
    }

    // Execute uploads with concurrency control
    await this.executeConcurrent(uploadTasks, maxConcurrentUploads);
  }

  // Upload individual chunk with retry logic
  private async uploadChunk(
    file: File, 
    fileIndex: number, 
    chunkIndex: number, 
    chunkSize: number
  ): Promise<void> {
    const maxRetries = this.options.maxRetries || 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        const start = chunkIndex * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);
        
        const formData = new FormData();
        formData.append('uploadId', this.uploadId!);
        formData.append('fileName', file.name);
        formData.append('chunkIndex', chunkIndex.toString());
        formData.append('chunk', chunk);
        
        const response = await fetch('/api/files/upload/chunked?action=chunk', {
          method: 'POST',
          body: formData,
          signal: this.abortController?.signal,
        });
        
        if (!response.ok) {
          throw new Error(`Chunk upload failed: ${response.statusText}`);
        }
        
        const result: ChunkUploadResult = await response.json();
        
        // Update progress
        this.uploadedBytes += chunk.size;
        this.options.onChunkProgress?.(fileIndex, chunkIndex, result.progress);
        
        return; // Success
        
      } catch (error: any) {
        attempt++;
        
        if (attempt >= maxRetries) {
          throw new Error(`Failed to upload chunk ${chunkIndex} for ${file.name} after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Execute tasks with concurrency control
  private async executeConcurrent<T>(
    tasks: Array<() => Promise<T>>, 
    maxConcurrency: number
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];
    
    for (const task of tasks) {
      const promise = task().then(result => {
        results.push(result);
        executing.splice(executing.indexOf(promise), 1);
      });
      
      executing.push(promise);
      
      if (executing.length >= maxConcurrency) {
        await Promise.race(executing);
      }
    }
    
    await Promise.all(executing);
    return results;
  }

  // Start real-time progress monitoring with Server-Sent Events
  private startProgressMonitoring(): void {
    if (!this.uploadId) return;
    
    this.eventSource = new EventSource(`/api/files/upload/chunked?action=status&uploadId=${this.uploadId}`);
    
    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.error) {
          this.options.onError?.(new Error(data.error));
          return;
        }
        
        const progress: UploadProgress = {
          overallProgress: this.calculateOverallProgress(data.progress),
          files: data.progress.map((fp: any) => ({
            fileName: fp.fileName,
            fileSize: this.options.files.find(f => f.name === fp.fileName)?.size || 0,
            uploadedChunks: fp.uploadedChunks,
            totalChunks: fp.totalChunks,
            progress: fp.progress,
            status: fp.progress === 100 ? 'completed' : 'uploading'
          })),
          uploadedBytes: this.uploadedBytes,
          totalBytes: this.totalBytes,
          uploadSpeed: this.calculateUploadSpeed(this.uploadedBytes),
          estimatedTimeRemaining: this.calculateETA(this.uploadedBytes, this.totalBytes)
        };
        
        this.options.onProgress?.(progress);
        
      } catch (error) {
        console.error('Progress monitoring error:', error);
      }
    };
    
    this.eventSource.onerror = (error) => {
      console.warn('SSE connection error:', error);
      // Fallback to polling if SSE fails
      this.startPollingProgress();
    };
  }

  // Fallback progress monitoring with polling
  private startPollingProgress(): void {
    if (!this.uploadId || !this.isUploading) return;
    
    const poll = async () => {
      try {
        const response = await fetch(`/api/files/upload/chunked?action=status&uploadId=${this.uploadId}`);
        if (response.ok) {
          const data = await response.json();
          // Process progress data similar to SSE handler
          // ... (same logic as SSE onmessage)
        }
      } catch (error) {
        console.warn('Polling progress error:', error);
      }
      
      if (this.isUploading) {
        setTimeout(poll, 2000); // Poll every 2 seconds
      }
    };
    
    poll();
  }

  // Complete upload and get final result
  private async completeUpload(): Promise<UploadResult> {
    const response = await fetch('/api/files/upload/chunked?action=complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId: this.uploadId }),
      signal: this.abortController?.signal,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to complete upload');
    }
    
    const result = await response.json();
    this.options.onComplete?.(result);
    
    return result;
  }

  // Abort upload and cleanup
  async abortUpload(): Promise<void> {
    try {
      this.isUploading = false;
      
      if (this.uploadId) {
        await fetch('/api/files/upload/chunked?action=abort', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uploadId: this.uploadId }),
        });
      }
      
      this.cleanup();
    } catch (error) {
      console.error('Abort upload error:', error);
    }
  }

  // Cleanup resources
  private cleanup(): void {
    this.isUploading = false;
    this.abortController?.abort();
    this.eventSource?.close();
    this.eventSource = null;
    this.abortController = null;
  }

  // Calculate overall progress across all files
  private calculateOverallProgress(fileProgress: any[]): number {
    if (!fileProgress.length) return 0;
    
    const totalProgress = fileProgress.reduce((sum, fp) => sum + fp.progress, 0);
    return totalProgress / fileProgress.length;
  }

  // Calculate upload speed
  private calculateUploadSpeed(uploadedBytes: number): number {
    const elapsedTime = (Date.now() - this.startTime) / 1000; // seconds
    return elapsedTime > 0 ? uploadedBytes / elapsedTime : 0;
  }

  // Calculate estimated time remaining
  private calculateETA(uploadedBytes: number, totalBytes: number): number {
    const speed = this.calculateUploadSpeed(uploadedBytes);
    const remainingBytes = totalBytes - uploadedBytes;
    return speed > 0 ? remainingBytes / speed : 0;
  }

  // Public method to check if upload is in progress
  public isActive(): boolean {
    return this.isUploading;
  }

  // Public method to get current upload ID
  public getUploadId(): string | null {
    return this.uploadId;
  }
}

// Utility function to format time duration
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}

// Utility function to format upload speed
export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond < 1024) {
    return `${Math.round(bytesPerSecond)} B/s`;
  } else if (bytesPerSecond < 1024 * 1024) {
    return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
  } else {
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  }
}