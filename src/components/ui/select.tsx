import * as React from "react";

interface SelectProps {
  children: React.ReactNode;
  value: string;
  onValueChange: (value: string) => void;
}

interface SelectContentProps {
  children: React.ReactNode;
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
}

interface SelectTriggerProps {
  children: React.ReactNode;
}

interface SelectValueProps {
  placeholder?: string;
}

export const Select = ({ children, value, onValueChange }: SelectProps) => {
  return (
    <div className="select">
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { 
            selectedValue: value,
            onValueChange 
          } as any);
        }
        return child;
      })}
    </div>
  );
};

export const SelectTrigger = ({ children }: SelectTriggerProps) => {
  return <div className="select-trigger">{children}</div>;
};

export const SelectValue = ({ placeholder }: SelectValueProps) => {
  return <span className="select-value">{placeholder}</span>;
};

export const SelectContent = ({ children }: SelectContentProps) => {
  return <div className="select-content">{children}</div>;
};

export const SelectItem = ({ value, children, selectedValue, onValueChange }: SelectItemProps & { selectedValue?: string; onValueChange?: (value: string) => void }) => {
  return (
    <div 
      className={`select-item ${selectedValue === value ? 'selected' : ''}`}
      onClick={() => onValueChange?.(value)}
    >
      {children}
    </div>
  );
};