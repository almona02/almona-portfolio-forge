import * as React from "react";

interface TooltipProps {
  children: React.ReactNode;
}

interface TooltipTriggerProps {
  children: React.ReactNode;
}

interface TooltipContentProps {
  children: React.ReactNode;
}

export const Tooltip = ({ children }: TooltipProps) => {
  return <div className="tooltip">{children}</div>;
};

export const TooltipProvider = ({ children }: TooltipProps) => {
  return <div className="tooltip-provider">{children}</div>;
};

export const TooltipTrigger = ({ children }: TooltipTriggerProps) => {
  return <span className="tooltip-trigger">{children}</span>;
};

export const TooltipContent = ({ children }: TooltipContentProps) => {
  return <div className="tooltip-content">{children}</div>;
};