import * as React from "react";

export interface TabsProps {
  defaultValue?: string;
  className?: string;
  children: React.ReactNode;
}

export const Tabs = ({ className = "", children }: TabsProps) => {
  return <div className={`tabs ${className}`}>{children}</div>;
};

export interface TabsListProps {
  className?: string;
  children: React.ReactNode;
}

export const TabsList = ({ className = "", children }: TabsListProps) => {
  return <div className={`tabs-list ${className}`}>{children}</div>;
};

export interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
}

export const TabsTrigger = ({ children }: TabsTriggerProps) => {
  return <button type="button" className="tabs-trigger">{children}</button>;
};

export interface TabsContentProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

export const TabsContent = ({ className = "", children }: TabsContentProps) => {
  return <div className={`tabs-content ${className}`}>{children}</div>;
};

export default Tabs;

