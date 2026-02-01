import * as React from "react";

type TabsContextValue = {
  value: string;
  onValueChange: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined);

export interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}

export const Tabs = ({ defaultValue, value, onValueChange, className = "", children }: TabsProps) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "");

  const isControlled = value !== undefined;
  const activeValue = isControlled ? value : internalValue;
  const handleValueChange = React.useCallback((newValue: string) => {
    if (!isControlled) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  }, [isControlled, onValueChange]);

  return (
    <TabsContext.Provider value={{ value: activeValue!, onValueChange: handleValueChange }}>
      <div className={`tabs ${className}`} data-value={activeValue}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

export interface TabsListProps {
  className?: string;
  children: React.ReactNode;
}

export const TabsList = ({ className = "", children }: TabsListProps) => {
  return <div className={`flex items-center p-1 bg-muted rounded-lg ${className}`}>{children}</div>;
};

export interface TabsTriggerProps {
  value: string;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export const TabsTrigger = ({ value, className = "", children, disabled }: TabsTriggerProps) => {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used within Tabs");

  const isActive = context.value === value;

  return (
    <button
      type="button"
      className={`px-3 py-1.5 text-sm font-medium transition-all rounded-md 
        ${isActive
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
        } 
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        ${className}`}
      onClick={() => !disabled && context.onValueChange(value)}
      disabled={disabled}
      data-state={isActive ? "active" : "inactive"}
    >
      {children}
    </button>
  );
};

export interface TabsContentProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

export const TabsContent = ({ value, className = "", children }: TabsContentProps) => {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be used within Tabs");

  if (context.value !== value) return null;

  return (
    <div
      className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}
      data-state="active"
    >
      {children}
    </div>
  );
};

export default Tabs;

