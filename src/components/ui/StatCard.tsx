import React from "react";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: string;
  color?: string;
}

export function StatCard({ label, value, icon, color = "bg-white" }: StatCardProps) {
  return (
    <div className={`${color} rounded-xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm`}>
      <div className="text-3xl">{icon}</div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
      </div>
    </div>
  );
}
