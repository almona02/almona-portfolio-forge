import React from "react";

interface EfficiencyCalculatorProps {
  materialType: string;
}

export const EfficiencyCalculator: React.FC<EfficiencyCalculatorProps> = ({ materialType }) => {
  return (
    <div className="border rounded p-4 text-center text-muted-foreground">
      <p>Efficiency Calculator Placeholder for: <strong>{materialType}</strong></p>
    </div>
  );
};
