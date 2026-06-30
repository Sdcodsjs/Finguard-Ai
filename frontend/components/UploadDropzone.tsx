"use client";

import { useCallback, useState, useRef } from "react";
import { Upload, FileText, X, CheckCircle, AlertCircle } from "lucide-react";

interface UploadDropzoneProps {
  onFileSelect: (file: File) => void;
  isUploading?: boolean;
  uploadProgress?: number;
  maxSizeMB?: number;
  accept?: string;
}

export default function UploadDropzone({
  onFileSelect,
  isUploading = false,
  uploadProgress = 0,
  maxSizeMB = 50,
  accept = ".pdf",
}: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    setError(null);
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted");
      return false;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File exceeds ${maxSizeMB}MB limit`);
      return false;
    }
    return true;
  };

  const handleFile = useCallback(
    (file: File) => {
      if (validateFile(file)) {
        setSelectedFile(file);
        onFileSelect(file);
      }
    },
    [onFileSelect, maxSizeMB]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const clearFile = () => {
    setSelectedFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
    return `${(bytes / 1_000).toFixed(0)} KB`;
  };

  return (
    <div className="w-full">
      {/* Dropzone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isUploading && inputRef.current?.click()}
        className={`
          relative cursor-pointer rounded-2xl border-2 border-dashed
          p-8 text-center transition-all duration-300
          ${isDragging
            ? "border-blue-400 bg-blue-500/10 shadow-lg shadow-blue-500/10"
            : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
          }
          ${isUploading ? "pointer-events-none opacity-70" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        {/* Icon */}
        <div
          className={`
            mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl
            transition-colors duration-300
            ${isDragging ? "bg-blue-500/20 text-blue-400" : "bg-white/5 text-gray-400"}
          `}
        >
          <Upload className={`h-8 w-8 transition-transform duration-300 ${isDragging ? "scale-110 -translate-y-1" : ""}`} />
        </div>

        <p className="text-sm font-medium text-gray-200">
          {isDragging ? "Drop your annual report here" : "Drag & drop annual report PDF"}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          or click to browse • PDF up to {maxSizeMB}MB
        </p>

        {/* Animated border glow on drag */}
        {isDragging && (
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/5 via-cyan-500/5 to-blue-500/5 animate-pulse" />
        )}
      </div>

      {/* Selected file info */}
      {selectedFile && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
            <FileText className="h-5 w-5 text-red-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-200">{selectedFile.name}</p>
            <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
          </div>

          {isUploading ? (
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-400">{uploadProgress}%</span>
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); clearFile(); }}
              className="rounded-lg p-1.5 text-gray-500 transition hover:bg-white/5 hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
