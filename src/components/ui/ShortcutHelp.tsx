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
            className="flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border bg-background/50 p-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Keyboard Shortcuts</h2>
                <p className="text-muted-foreground">Master your workflow with these hotkeys</p>
              </div>
              <button 
                onClick={onClose}
                className="rounded-full p-2 text-muted-foreground hover:bg-card hover:text-foreground transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col gap-4 border-b border-border bg-background p-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input
                  type="text"
                  placeholder="Search shortcuts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 font-mono text-xs">
                <button
                  onClick={() => setActiveCategory('all')}
                  className={`rounded-lg border px-3 py-1.5 transition-colors ${
                    activeCategory === 'all'
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-500'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted'
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
                        : 'border-border bg-card text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-background p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredShortcuts.map((shortcut) => (
                  <div 
                    key={shortcut.action}
                    className="group flex items-center justify-between rounded-lg border border-border bg-card/50 p-3 hover:border-border hover:bg-card transition-all"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">{shortcut.description}</span>
                      <span className="text-xs text-muted-foreground capitalize">{shortcut.category}</span>
                    </div>
                    <kbd className="flex h-8 min-w-[2rem] items-center justify-center rounded border border-border bg-muted px-2 font-mono text-xs font-bold text-foreground shadow-sm group-hover:border-border group-hover:bg-muted">
                      {ShortcutUtils.getPlatformKeyDisplay(shortcut.key)}
                    </kbd>
                  </div>
                ))}

                {filteredShortcuts.length === 0 && (
                  <div className="col-span-full py-12 text-center text-muted-foreground">
                    <p>No shortcuts found matching your search.</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Footer */}
            <div className="border-t border-border bg-background/30 p-4 text-center text-xs text-muted-foreground">
              Press <span className="rounded bg-card px-1 py-0.5 font-mono text-foreground">?</span> anytime to toggle this menu
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
