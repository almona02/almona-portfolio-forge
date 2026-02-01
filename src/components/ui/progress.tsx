import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  indicatorClassName?: string;
}

export const Progress = ({ value = 0, className = "", indicatorClassName = "", ...props }: ProgressProps) => {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("progress relative h-2 w-full rounded bg-gray-700 overflow-hidden", className)} {...props}>
      <div
        className={cn("h-full transition-all duration-500 ease-in-out", indicatorClassName || "bg-almona-orange")}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
};

export default Progress;

