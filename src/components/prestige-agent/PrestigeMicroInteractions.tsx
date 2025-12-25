/**
 * Prestige Micro-Interactions
 * Professional feedback and animations
 */

import { toast } from 'sonner';
import { CheckCircle, AlertTriangle, Info, ThumbsUp, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

export interface PersonaConfig {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  color?: string;
  animation?: string;
}

export class PrestigeMicroInteractions {
  constructor() {
    // Audio feedback can be added here if needed
    // this.sounds = { ... };
  }

  showConfidenceToast(confidence: number) {
    const getColor = (conf: number) => {
      if (conf >= 95) return 'text-green-600';
      if (conf >= 85) return 'text-blue-600';
      if (conf >= 75) return 'text-amber-600';
      return 'text-red-600';
    };

    const getIcon = (conf: number) => {
      if (conf >= 95) return CheckCircle;
      if (conf >= 85) return ThumbsUp;
      if (conf >= 75) return Info;
      return AlertTriangle;
    };

    const Icon = getIcon(confidence);
    const color = getColor(confidence);

    toast.custom((t) => (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`max-w-md w-full bg-white shadow-lg rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 ${
          t.visible ? 'animate-enter' : 'animate-leave'
        }`}
      >
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900">
                Response Ready
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Response received
              </p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-gray-200">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Dismiss
          </button>
        </div>
      </motion.div>
    ), {
      duration: 3000,
      position: 'top-right'
    });
  }

  showKnowledgeRecall() {
    return toast.custom((t) => (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="flex items-center space-x-3 bg-white p-4 rounded-xl shadow-lg"
      >
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
          <BookOpen className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <p className="font-medium text-sm">Accessing Knowledge Base</p>
          <p className="text-xs text-gray-500">Accessing knowledge base</p>
        </div>
      </motion.div>
    ), {
      duration: 2000,
      position: 'top-right'
    });
  }

  showPersonaTransition(persona: PersonaConfig) {
    const PersonaIcon = persona.icon;
    
    return toast.custom((t) => (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className="flex items-center space-x-3 bg-white p-4 rounded-xl shadow-lg"
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
          <PersonaIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-sm">Switched to {persona.title}</p>
          <p className="text-xs text-gray-500">{persona.subtitle}</p>
        </div>
      </motion.div>
    ), {
      duration: 1500,
      position: 'top-center'
    });
  }

  showLearningProgress(module: string, progress: number) {
    return toast.custom((t) => (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-white p-4 rounded-xl shadow-lg w-64"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-sm">Learning Progress</span>
          <span className="text-xs text-gray-500">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full"
          />
        </div>
        <div className="mt-2 text-xs text-gray-600">
          Module: <span className="font-medium">{module}</span>
        </div>
      </motion.div>
    ), {
      duration: 3000,
      position: 'bottom-right'
    });
  }

  showError(message: string) {
    return toast.error(message, {
      duration: 4000,
      position: 'top-right'
    });
  }

  showSuccess(message: string) {
    return toast.success(message, {
      duration: 3000,
      position: 'top-right'
    });
  }
}

