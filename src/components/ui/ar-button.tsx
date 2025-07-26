import * as React from "react";

interface ArButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  modelUrl: string;
}

export const ArButton = ({ className, modelUrl, ...props }: ArButtonProps) => {
  return (
    <button
      className={`ar-button ${className}`}
      data-model-url={modelUrl}
      {...props}
    />
  );
};