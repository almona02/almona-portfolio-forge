import * as React from "react";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
}

export const Progress = ({ value = 0, className = "", ...props }: ProgressProps) => {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={`progress relative h-2 w-full rounded bg-gray-700 ${className}`} {...props}>
      <div
        className="absolute left-0 top-0 h-full rounded bg-orange-500 transition-all"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
};

export default Progress;

