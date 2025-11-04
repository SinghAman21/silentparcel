'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, FileText, FolderOpen } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface FileDropzoneProps {
  onFileSelect: (files: File[]) => void;
}

export function FileDropzone({ onFileSelect }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Recursively traverse directories using webkitGetAsEntry
  const traverseFileTree = useCallback((item: any, path = '', collected: File[] = [], done: () => void) => {
    if (item.isFile) {
      item.file((file: File) => {
        // Attach the relative path for backend
        Object.defineProperty(file, 'webkitRelativePath', {
          value: path + item.name,
          writable: false,
        });
        collected.push(file);
        done();
      });
    } else if (item.isDirectory) {
      const dirReader = item.createReader();
      dirReader.readEntries((entries: any[]) => {
        let remaining = entries.length;
        if (!remaining) done();
        for (const entry of entries) {
          traverseFileTree(entry, path + item.name + '/', collected, () => {
            remaining--;
            if (remaining === 0) done();
          });
        }
      });
    } else {
      done();
    }
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  // Handle drag leave
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // Handle drop (files and folders)
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    if (items && items.length > 0 && typeof items[0].webkitGetAsEntry === 'function') {
      // Folder or mixed drop
      const files: File[] = [];
      let pending = 0;
      let finished = false;

      const maybeFinish = () => {
        if (!finished && pending === 0) {
          finished = true;
          onFileSelect(files);
        }
      };

      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry();
        if (entry) {
          pending++;
          traverseFileTree(entry, '', files, () => {
            pending--;
            maybeFinish();
          });
        }
      }
      // In case nothing is pending (empty drop)
      maybeFinish();
    } else {
      // Fallback: just use files (no folder structure)
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onFileSelect(files);
      }
    }
  }, [onFileSelect, traverseFileTree]);

  // Handle file/folder input (manual selection)
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(Array.from(files));
    }
    // Reset input so the same file/folder can be selected again
    e.target.value = '';
  }, [onFileSelect]);

  return (
    <Card
      className={`
      p-10 border-2 border-dashed transition-all duration-300 cursor-pointer rounded-2xl shadow-sm bg-card/30
      ${isDragging
        ? 'border-primary bg-primary/10 scale-[1.03]'
        : 'border-border/40 hover:border-primary/40 hover:bg-accent/30'
      }
      `}
    >
      <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex flex-col items-center justify-center gap-6 min-h-[260px]"
      >
      <div
        className={`
        w-14 h-14 flex items-center justify-center rounded-xl transition-all duration-300
        ${isDragging ? 'bg-primary text-primary-foreground scale-110 shadow-lg' : 'bg-muted/60 text-muted-foreground'}
        `}
      >
        <Upload className="h-7 w-7" />
      </div>

      <div className="text-center">
        <h3 className="text-xl font-semibold mb-1 tracking-tight">
        {isDragging
          ? 'Drop files or folders'
          : 'Drag & drop files or folders'}
        </h3>
        <p className="text-sm text-muted-foreground mb-0.5">
        or select below (max 50MB )
        </p>
      </div>

      <div className="flex gap-3">
        {/* Single file input */}
        <input
        type="file"
        className="hidden"
        id="file-input"
        accept="*/*"
        ref={fileInputRef}
        onChange={handleFileInput}
        />
        <Button
        asChild
        variant="ghost"
        className="px-4 py-2 rounded-lg border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all text-base font-medium"
        >
        <label htmlFor="file-input" className="cursor-pointer flex items-center gap-2">
          <FileText className="h-4 w-4" />
          File
        </label>
        </Button>

        {/* Folder input */}
        <input
        type="file"
        className="hidden"
        id="folder-input"
        // @ts-ignore
        webkitdirectory="true"
        multiple
        ref={folderInputRef}
        onChange={handleFileInput}
        />
        <Button
        asChild
        variant="ghost"
        className="px-4 py-2 rounded-lg border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all text-base font-medium"
        >
        <label htmlFor="folder-input" className="cursor-pointer flex items-center gap-2">
          <FolderOpen className="h-4 w-4" />
          Folder
        </label>
        </Button>
      </div>
      </div>
    </Card>
  );
}