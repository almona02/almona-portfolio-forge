import React from "react";

interface Standard {
  name: string;
  description: string;
}

interface LocalStandardsTableProps {
  standards: Standard[];
  region: string;
}

export const LocalStandardsTable: React.FC<LocalStandardsTableProps> = ({ standards, region }) => {
  return (
    <table className="w-full border-collapse border border-gray-300 dark:border-gray-700">
      <thead>
        <tr className="bg-muted text-left">
          <th className="border border-gray-300 dark:border-gray-700 px-4 py-2">Standard</th>
          <th className="border border-gray-300 dark:border-gray-700 px-4 py-2">Description</th>
        </tr>
      </thead>
      <tbody>
        {standards.map((standard, index) => (
          <tr key={index} className={index % 2 === 0 ? "bg-muted/50" : ""}>
            <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">{standard.name}</td>
            <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">{standard.description}</td>
          </tr>
        ))}
      </tbody>
      <caption className="text-sm text-muted-foreground mt-2">Standards applicable in {region}</caption>
    </table>
  );
};
