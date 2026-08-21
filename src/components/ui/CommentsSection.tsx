"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface Comment {
  id: number;
  entity_type: string;
  entity_id: number;
  author: string;
  body: string;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  created_at: string;
}

interface CommentsSectionProps {
  entityType: "group" | "subtype" | "knowledge";
  entityId: number;
}

const ALLOWED_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.webp',
  '.pdf', '.txt', '.csv', '.xml', '.json',
  '.doc', '.docx', '.xls', '.xlsx', '.zip', '.log', '.sql',
];

export function CommentsSection({ entityType, entityId }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments?entity_type=${entityType}&entity_id=${entityId}`);
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } catch {
      console.error("Failed to load comments");
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      const ext = '.' + selected.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setError(`File type "${ext}" is not allowed.`);
        return;
      }
      if (selected.size > 10 * 1024 * 1024) {
        setError("File too large. Maximum size is 10MB.");
        return;
      }
      setFile(selected);
      setFileName(selected.name);
      setError("");
    }
  };

  const removeFile = () => {
    setFile(null);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() && !file) return;
    setPosting(true);
    setError("");

    try {
      let res: Response;

      if (file) {
        // Use multipart form data for file upload
        const formData = new FormData();
        formData.append("entity_type", entityType);
        formData.append("entity_id", String(entityId));
        formData.append("author", author.trim() || "Anonymous");
        formData.append("comment_body", body.trim());
        formData.append("file", file);

        res = await fetch("/api/comments", {
          method: "POST",
          body: formData,
        });
      } else {
        // Use JSON for text-only comments
        res = await fetch("/api/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entity_type: entityType,
            entity_id: entityId,
            author: author.trim() || "Anonymous",
            comment_body: body.trim(),
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to post comment");
        return;
      }
      setBody("");
      removeFile();
      loadComments();
    } catch {
      setError("Network error posting comment");
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!confirm("Delete this comment?")) return;
    try {
      await fetch(`/api/comments?id=${commentId}`, { method: "DELETE" });
      loadComments();
    } catch {
      console.error("Failed to delete comment");
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return "📎";
    if (fileType.includes("pdf")) return "📄";
    if (fileType.includes("image")) return "🖼️";
    if (fileType.includes("zip")) return "📦";
    if (fileType.includes("word") || fileType.includes("document")) return "📝";
    if (fileType.includes("excel") || fileType.includes("sheet")) return "📊";
    return "📎";
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Comments & Discussion
        {comments.length > 0 && (
          <span className="ml-2 text-xs font-normal text-gray-400">({comments.length})</span>
        )}
      </h2>

      {/* Existing comments */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-3 mb-4">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                    {comment.author.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-gray-700">{comment.author}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{formatDate(comment.created_at)}</span>
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="text-xs text-red-400 hover:text-red-600"
                    title="Delete comment"
                  >
                    ×
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.body}</p>

              {/* Attached file */}
              {comment.file_name && (
                <div className="mt-2 flex items-center gap-2 p-2 bg-white rounded border border-gray-200">
                  <span className="text-sm">{getFileIcon(comment.file_type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 truncate">{comment.file_name}</p>
                    {comment.file_size && (
                      <p className="text-xs text-gray-400">{formatSize(comment.file_size)}</p>
                    )}
                  </div>
                  <a
                    href={`/api/comments/download?file=${comment.file_name}`}
                    className="text-xs font-medium hover:underline flex-shrink-0"
                    style={{ color: "var(--primary)" }}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 mb-4">No comments yet. Be the first to add information.</p>
      )}

      {/* Comment form */}
      <form onSubmit={handlePost} className="space-y-3 border-t border-gray-200 pt-4">
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Your name (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write a comment..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>

        {/* File attachment */}
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept={ALLOWED_EXTENSIONS.join(",")}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            📎 Attach file
          </button>
          {fileName && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span className="truncate max-w-[200px]">{fileName}</span>
              <button
                type="button"
                onClick={removeFile}
                className="text-red-400 hover:text-red-600"
              >
                ×
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={posting || (!body.trim() && !file)}
            className="btn-primary text-xs disabled:opacity-50"
          >
            {posting ? "Posting..." : "Post Comment"}
          </button>
        </div>
      </form>
    </div>
  );
}
