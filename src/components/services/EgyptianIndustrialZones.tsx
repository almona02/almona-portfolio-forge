import { useState } from "react";

const EgyptianIndustrialZones = ({ interactive = false }) => {
  const [selectedZone, setSelectedZone] = useState("");
  
  const industrialZones = [
    { id: "6october", name: "6th October City", machines: 42 },
    { id: "10ramadan", name: "10th of Ramadan City", machines: 38 },
    { id: "alex", name: "Alexandria Industrial Zone", machines: 24 },
    { id: "suez", name: "Suez Industrial Zone", machines: 18 },
  ];

  return (
    <div className={`${interactive ? "h-full" : "h-96"} relative`}>
      {/* Simplified map representation */}
      <div className="bg-gradient-to-br from-egyptian-blue/20 to-almona-darker h-full rounded-lg flex items-center justify-center">
        <div className="grid grid-cols-2 gap-4">
          {industrialZones.map(zone => (
            <div 
              key={zone.id}
              className={`p-4 rounded-lg cursor-pointer transition-all ${
                selectedZone === zone.id 
                  ? "bg-egyptian-blue text-white" 
                  : "bg-almona-dark/70 hover:bg-almona-dark"
              }`}
              onClick={() => interactive && setSelectedZone(zone.id)}
            >
              <div className="font-bold">{zone.name}</div>
              <div className="text-sm">{zone.machines} {interactive ? "Registered Machines" : "Machines"}</div>
            </div>
          ))}
        </div>
      </div>
      
      {interactive && selectedZone && (
        <div className="absolute inset-0 bg-almona-dark/90 flex items-center justify-center p-6">
          <div className="bg-almona-darker p-6 rounded-lg max-w-md">
            <h3 className="text-xl font-bold mb-4">
              {industrialZones.find(z => z.id === selectedZone)?.name}
            </h3>
            <p className="mb-4">
              Technical support available 24/7 for all registered machines in this zone.
            </p>
            <button 
              className="text-orange-500 hover:underline"
              onClick={() => setSelectedZone("")}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EgyptianIndustrialZones;