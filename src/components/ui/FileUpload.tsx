"use client";

import { useState, useRef } from "react";

interface FileItem {
  id: number;
  original_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

interface FileUploadProps {
  ticketId: number;
  files: FileItem[];
  onFilesChanged: () => void;
}

const ALLOWED_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.webp',
  '.pdf', '.txt', '.csv', '.xml', '.json',
  '.doc', '.docx', '.xls', '.xlsx', '.zip', '.log', '.sql',
];

export function FileUpload({ ticketId, files, onFilesChanged }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError(`File type "${ext}" is not allowed.`);
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. Maximum size is 10MB.");
      return false;
    }
    return true;
  };

  const uploadFile = async (file: File) => {
    if (!validateFile(file)) return;

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("ticket_id", String(ticketId));
      formData.append("file", file);

      const res = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }

      onFilesChanged();
    } catch {
      setError("Network error during upload");
    } finally {
      setUploading(false);
    }
  };

  const handleFiles = (fileList: FileList) => {
    const file = fileList[0];
    if (file) uploadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDelete = async (fileId: number, fileName: string) => {
    if (!confirm(`Delete "${fileName}"?`)) return;
    try {
      await fetch(`/api/files/${fileId}`, { method: "DELETE" });
      onFilesChanged();
    } catch {
      setError("Failed to delete file");
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-[var(--primary)] bg-[var(--primary-lighter)]"
            : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          accept={ALLOWED_EXTENSIONS.join(",")}
        />
        {uploading ? (
          <p className="text-sm text-gray-500">Uploading...</p>
        ) : (
          <p className="text-sm text-gray-500">
            Drag & drop or <span className="font-medium" style={{ color: "var(--primary)" }}>click to upload</span>
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          PNG, JPG, PDF, TXT, CSV, DOC, XLS, ZIP, LOG — Max 10MB
        </p>
      </div>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((file) => (
            <div key={file.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-100 hover:bg-gray-50">
              <span className="text-xs text-gray-400 flex-shrink-0">
                {file.mime_type.includes("pdf") ? "📄" :
                 file.mime_type.includes("image") ? "🖼️" :
                 file.mime_type.includes("zip") ? "📦" : "📎"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 truncate">{file.original_name}</p>
                <p className="text-xs text-gray-400">{formatSize(file.file_size)}</p>
              </div>
              <a
                href={`/api/files/${file.id}/download`}
                className="text-xs font-medium hover:underline flex-shrink-0"
                style={{ color: "var(--primary)" }}
              >
                Download
              </a>
              <button
                onClick={() => handleDelete(file.id, file.original_name)}
                className="text-xs text-red-500 hover:text-red-700 flex-shrink-0"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
