import { AnimatePresence, motion } from 'framer-motion';
import React, { useState } from 'react';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { shortcutCategories, ShortcutUtils } from '../../lib/keyboard/shortcuts';

interface ShortcutHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutHelp: React.FC<ShortcutHelpProps> = ({ isOpen, onClose }) => {
  const { shortcuts } = useKeyboardShortcuts();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filteredShortcuts = shortcuts.filter((s) => {
    const matchesSearch = 
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.key.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = activeCategory === 'all' || s.category === activeCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/50 p-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Keyboard Shortcuts</h2>
                <p className="text-slate-400">Master your workflow with these hotkeys</p>
              </div>
              <button 
                onClick={onClose}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col gap-4 border-b border-slate-800 bg-slate-900 p-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input
                  type="text"
                  placeholder="Search shortcuts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 font-mono text-xs">
                <button
                  onClick={() => setActiveCategory('all')}
                  className={`rounded-lg border px-3 py-1.5 transition-colors ${
                    activeCategory === 'all'
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-500'
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  ALL
                </button>
                {Object.entries(shortcutCategories).map(([key, category]) => (
                  <button
                    key={key}
                    onClick={() => setActiveCategory(key)}
                    className={`whitespace-nowrap rounded-lg border px-3 py-1.5 transition-colors ${
                      activeCategory === key
                        ? 'border-amber-500/50 bg-amber-500/10 text-amber-500'
                        : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-slate-900 p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredShortcuts.map((shortcut) => (
                  <div 
                    key={shortcut.action}
                    className="group flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/50 p-3 hover:border-slate-700 hover:bg-slate-800 transition-all"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-200">{shortcut.description}</span>
                      <span className="text-xs text-slate-500 capitalize">{shortcut.category}</span>
                    </div>
                    <kbd className="flex h-8 min-w-[2rem] items-center justify-center rounded border border-slate-600 bg-slate-700 px-2 font-mono text-xs font-bold text-white shadow-sm group-hover:border-slate-500 group-hover:bg-slate-600">
                      {ShortcutUtils.getPlatformKeyDisplay(shortcut.key)}
                    </kbd>
                  </div>
                ))}

                {filteredShortcuts.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-500">
                    <p>No shortcuts found matching your search.</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Footer */}
            <div className="border-t border-slate-800 bg-slate-950/30 p-4 text-center text-xs text-slate-500">
              Press <span className="rounded bg-slate-800 px-1 py-0.5 font-mono text-slate-300">?</span> anytime to toggle this menu
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
