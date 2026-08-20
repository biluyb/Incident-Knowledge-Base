import React from "react";

const colorMap: Record<string, string> = {
  // Status
  "permanently closed": "bg-gray-100 text-gray-700 border-gray-200",
  closed: "bg-gray-100 text-gray-700 border-gray-200",
  open: "bg-green-50 text-green-700 border-green-200",
  "in progress": "bg-amber-50 text-amber-700 border-amber-200",
  published: "bg-green-50 text-green-700 border-green-200",
  draft: "bg-gray-100 text-gray-600 border-gray-200",
  deprecated: "bg-red-50 text-red-700 border-red-200",
  // Confidence
  high: "bg-green-50 text-green-700 border-green-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: string;
  className?: string;
}

export function Badge({ children, variant, className = "" }: BadgeProps) {
  const key = (variant || "").toLowerCase();
  const colors = colorMap[key] || "bg-gray-100 text-gray-600 border-gray-200";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors} ${className}`}
    >
      {children}
    </span>
  );
}
