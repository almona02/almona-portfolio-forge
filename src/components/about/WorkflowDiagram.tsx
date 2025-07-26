import React from "react";

interface WorkflowDiagramProps {
  workflowType: string;
}

export const WorkflowDiagram: React.FC<WorkflowDiagramProps> = ({ workflowType }) => {
  return (
    <div className="border rounded p-4 text-center text-muted-foreground">
      <p>Workflow Diagram Placeholder for: <strong>{workflowType}</strong></p>
    </div>
  );
};
