import React from "react";

const colorMap: Record<string, string> = {
  // Priority
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-green-100 text-green-800 border-green-200",
  // Status
  "permanently closed": "bg-gray-100 text-gray-800 border-gray-200",
  closed: "bg-gray-100 text-gray-800 border-gray-200",
  open: "bg-blue-100 text-blue-800 border-blue-200",
  in progress: "bg-purple-100 text-purple-800 border-purple-200",
  published: "bg-green-100 text-green-800 border-green-200",
  draft: "bg-yellow-100 text-yellow-800 border-yellow-200",
  deprecated: "bg-red-100 text-red-800 border-red-200",
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: string;
  className?: string;
}

export function Badge({ children, variant, className = "" }: BadgeProps) {
  const key = (variant || "").toLowerCase();
  const colors = colorMap[key] || "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors} ${className}`}
    >
      {children}
    </span>
  );
}
