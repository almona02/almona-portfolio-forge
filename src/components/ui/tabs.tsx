import * as React from "react";

interface TabsProps {
  children: React.ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export const Tabs = ({
  children,
  value,
  onValueChange,
  className
}: TabsProps) => {
  return (
    <div className={`tabs ${className || ''}`}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            activeValue: value,
            onValueChange
          } as any);
        }
        return child;
      })}
    </div>
  );
};

export const TabsList = ({
  children,
  className
}: TabsListProps) => {
  return <div className={`tabs-list ${className || ''}`}>{children}</div>;
};

export const TabsTrigger = ({
  value,
  children,
  className,
  activeValue,
  onValueChange
}: TabsTriggerProps & { activeValue?: string; onValueChange?: (value: string) => void }) => {
  const isActive = activeValue === value;
  
  return (
    <button
      className={`tabs-trigger ${isActive ? 'active' : ''} ${className || ''}`}
      onClick={() => onValueChange?.(value)}
    >
      {children}
    </button>
  );
};

export const TabsContent = ({
  value,
  children,
  className,
  activeValue
}: TabsContentProps & { activeValue?: string }) => {
  const isActive = activeValue === value;
  
  return isActive ? (
    <div className={`tabs-content ${className || ''}`}>
      {children}
    </div>
  ) : null;
};