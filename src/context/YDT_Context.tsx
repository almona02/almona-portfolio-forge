
import { usePrestigeAgent } from '@/hooks/usePrestigeAgent';
import { ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react';

// --- Types ---

export interface PartInfo {
  id: string;
  name: string;
  partNumber: string;
  inStock: boolean;
  price: number;
  diagramCoordinate?: { x: number; y: number }; // For interactive locker
}

export interface MachineKnowledge {
  model: string;
  manualUrl?: string;
  maintenanceRoutines: {
    daily: string[];
    weekly: string[];
    monthly: string[];
  };
  parts: PartInfo[];
}

interface YDTContextType {
  // Chat / Assistant
  askAssistant: (query: string, context?: string) => Promise<string>;
  isThinking: boolean;
  
  // Knowledge Graph (Mocked for Phase 1)
  getMachineKnowledge: (model: string) => Promise<MachineKnowledge | null>;
  
  // Maalem Judgment (Predictive Logic)
  analyzeMachineStatus: (telemetry: any) => { status: 'healthy' | 'warning' | 'critical'; advice: string };
  
  // Connection Status of the Brain
  isConnected: boolean;
}

// --- Mock Data (The "Graph") ---
const MOCK_KNOWLEDGE_BASE: Record<string, MachineKnowledge> = {
  'DK-502': {
    model: 'Double Head Cutting Machine DK-502',
    manualUrl: '/manuals/dk502.pdf',
    maintenanceRoutines: {
      daily: ['Clean chips from bed', 'Check oil mist level (must be > 70%)', 'Verify air pressure (6-7 Bar)'],
      weekly: ['Inspect saw blade sharpness', 'Check belt tension'],
      monthly: ['Deep clean guide rails', 'Calibrate angles']
    },
    parts: [
      { id: 'p1', name: 'Saw Blade 420mm', partNumber: 'Y-BLD-420-Z', inStock: true, price: 4500, diagramCoordinate: { x: 30, y: 40 } },
      { id: 'p2', name: 'Pneumatic Cylinder', partNumber: 'Y-PN-50A', inStock: false, price: 2100, diagramCoordinate: { x: 60, y: 20 } },
      { id: 'p3', name: 'Mist Sprayer', partNumber: 'Y-MS-01', inStock: true, price: 350, diagramCoordinate: { x: 45, y: 55 } },
    ]
  },
  // We can expand this later
};

const YDTContext = createContext<YDTContextType | undefined>(undefined);

export function YDTProvider({ children }: { children: ReactNode }) {
  const { sendMessage, isLoading: agentLoading } = usePrestigeAgent();
  const [isConnected, setIsConnected] = useState(false);

  // Initial handshake check
  useEffect(() => {
    // Simulate connection to "Brain"
    const timer = setTimeout(() => setIsConnected(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const askAssistant = useCallback(async (query: string, context?: string) => {
    try {
      // We can prepend context to the message for the agent
      const fullPrompt = context ? `[Context: ${context}] ${query}` : query;
      const response = await sendMessage(fullPrompt, 'professor'); // 'professor' is the technical expert persona
      return response.data?.response || "I'm having trouble accessing my knowledge base right now.";
    } catch (err) {
      console.error("YDT Chat Error:", err);
      return "Connection to YDT Brain interrupted.";
    }
  }, [sendMessage]);

  const getMachineKnowledge = useCallback(async (model: string) => {
    // Simulate async fetch
    return new Promise<MachineKnowledge | null>((resolve) => {
       setTimeout(() => {
         // Fuzzy match or direct lookup
         const key = Object.keys(MOCK_KNOWLEDGE_BASE).find(k => model.includes(k));
         resolve(key ? MOCK_KNOWLEDGE_BASE[key] : null);
       }, 500);
    });
  }, []);

  // "Maalem Judgment" - simple rule engine for now
  const analyzeMachineStatus = useCallback((telemetry: any) => {
    if (!telemetry) return { status: 'healthy' as const, advice: 'No data available.' };
    
    // Example Logic
    if (telemetry.spindleTemp > 70) {
      return { status: 'critical' as const, advice: 'Spindle overheating! Check cooling system immediately.' };
    }
    if (telemetry.vibration > 5) {
      return { status: 'warning' as const, advice: 'High vibration detected. Check blade balance or loose clamps.' };
    }
    
    return { status: 'healthy' as const, advice: 'Machine running within optimal parameters.' };
  }, []);

  const value = {
    askAssistant,
    isThinking: agentLoading,
    getMachineKnowledge,
    analyzeMachineStatus,
    isConnected
  };

  return (
    <YDTContext.Provider value={value}>
      {children}
    </YDTContext.Provider>
  );
}

export function useYDT() {
  const context = useContext(YDTContext);
  if (context === undefined) {
    throw new Error('useYDT must be used within a YDTProvider');
  }
  return context;
}
