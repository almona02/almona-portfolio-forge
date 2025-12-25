import { Link } from "react-router-dom";
import { BrainCircuit, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Simple AI Agent Status Component
 * Clean, minimal, professional - Almona orange/amber theme
 */
export const AIAgentStatus = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="relative"
    >
      <Link
        to="/prestige-agent"
        className="group block"
      >
        <div className="relative border border-orange-500/20 bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-sm rounded-lg p-4 sm:p-5 transition-all duration-300 hover:border-orange-400/40 hover:shadow-lg hover:shadow-orange-500/10">
          <div className="flex items-center justify-between gap-4">
            {/* AI Icon */}
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center group-hover:border-amber-400/50 transition-colors">
                <BrainCircuit className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 group-hover:text-amber-300 transition-colors" />
              </div>
              {/* Active indicator */}
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-900">
                <motion.div
                  className="w-full h-full bg-green-400 rounded-full"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-white group-hover:text-orange-300 transition-colors mb-0.5">
                YDT Agent
              </h3>
              <p className="text-xs text-slate-400 truncate">
                Industrial AI Assistant
              </p>
            </div>
            
            {/* Arrow */}
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400/50 group-hover:text-orange-300 group-hover:translate-x-1 transition-all flex-shrink-0" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

