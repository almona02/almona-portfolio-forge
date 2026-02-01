
import { Package } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { ProfileRegistry, type SystemDefinition } from '../services/ProfileRegistry';

interface SystemSelectorProps {
    activeSystemId: string;
    onSystemChange: (systemId: string) => void;
}

export const SystemSelector: React.FC<SystemSelectorProps> = ({
    activeSystemId,
    onSystemChange
}) => {
    const [systems, setSystems] = useState<SystemDefinition[]>([]);

    useEffect(() => {
        // Load systems from registry
        setSystems(ProfileRegistry.getInstance().getAllSystems());
    }, []);

    return (
        <div className="space-y-3 p-3 bg-slate-50 rounded border border-slate-200">
            <div className="flex items-center gap-2">
                <Package size={16} className="text-slate-600" />
                <span className="text-sm font-medium text-slate-800">
                    System Pack
                </span>
            </div>

            <select
                value={activeSystemId}
                onChange={(e) => onSystemChange(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 bg-white shadow-sm focus:ring-1 focus:ring-blue-500"
            >
                {systems.map(sys => (
                    <option key={sys.id} value={sys.id}>
                        {sys.name}
                    </option>
                ))}
            </select>

            <div className="text-[10px] text-slate-500 px-1">
                {systems.find(s => s.id === activeSystemId)?.description}
            </div>
        </div>
    );
};
