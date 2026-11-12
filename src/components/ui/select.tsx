import * as React from "react";

type SelectContextValue = {
  value: string;
  onValueChange: (value: string) => void;
};

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelectContext(component: string): SelectContextValue {
  const ctx = React.useContext(SelectContext);
  if (!ctx) {
    throw new Error(`${component} must be used within <Select>`);
  }
  return ctx;
}

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
  className?: string;
}

interface SelectValueProps {
  placeholder?: string;
}

/**
 * Lightweight Select that preserves the controlled value / onValueChange contract
 * through nested SelectContent → SelectItem (via context, not only direct children).
 */
export const Select = ({ children, value, onValueChange }: SelectProps) => {
  const ctx = React.useMemo(
    () => ({ value, onValueChange }),
    [value, onValueChange],
  );
  return (
    <SelectContext.Provider value={ctx}>
      <div className="select" data-selected-value={value || undefined}>
        {children}
      </div>
    </SelectContext.Provider>
  );
};

export const SelectTrigger = ({ children, className }: SelectTriggerProps) => {
  return <div className={`select-trigger ${className || ""}`}>{children}</div>;
};

export const SelectValue = ({ placeholder }: SelectValueProps) => {
  const { value } = useSelectContext("SelectValue");
  const display = value?.trim() ? value : placeholder;
  return (
    <span className="select-value" data-placeholder={!value?.trim() || undefined}>
      {display}
    </span>
  );
};

export const SelectContent = ({ children }: SelectContentProps) => {
  return <div className="select-content">{children}</div>;
};

export const SelectItem = ({ value, children }: SelectItemProps) => {
  const { value: selectedValue, onValueChange } = useSelectContext("SelectItem");
  return (
    <div
      role="option"
      data-value={value}
      aria-selected={selectedValue === value}
      className={`select-item ${selectedValue === value ? "selected" : ""}`}
      onClick={() => onValueChange(value)}
    >
      {children}
    </div>
  );
};
