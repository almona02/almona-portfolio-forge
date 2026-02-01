/**
 * Help Panel Component
 * 
 * Comprehensive help system with searchable documentation, keyboard shortcuts,
 * tool descriptions, and usage examples for the Drafting Workbench.
 * 
 * Constitutional: Deterministic help content, no ML/AI
 * Tier: 3 Protected Determinism
 */

import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { ScrollArea } from '@/shared/ui/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { BookOpen, ChevronRight, Info, Keyboard, Search, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { safeEventHandler } from '../utils/componentHardening';
import { TOOLTIP_CONTENT } from '../utils/tooltipContent';

interface HelpPanelProps {
  /** On close */
  onClose?: () => void;
  /** Initial search query */
  initialQuery?: string;
  /** Class name */
  className?: string;
}

type HelpCategory = 'all' | 'tool' | 'control' | 'action' | 'navigation' | 'viewport';

export const HelpPanel: React.FC<HelpPanelProps> = ({
  onClose,
  initialQuery = '',
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<HelpCategory>('all');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  // Filter and search help content
  const filteredContent = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const category = selectedCategory;

    return Object.entries(TOOLTIP_CONTENT)
      .filter(([key, content]) => {
        // Category filter
        if (category !== 'all' && content.category !== category) {
          return false;
        }

        // Search filter
        if (query.length === 0) {
          return true;
        }

        return (
          key.toLowerCase().includes(query) ||
          content.title.toLowerCase().includes(query) ||
          content.description.toLowerCase().includes(query) ||
          (content.usageExample && content.usageExample.toLowerCase().includes(query)) ||
          (content.keyboardShortcut && content.keyboardShortcut.toLowerCase().includes(query))
        );
      })
      .map(([key, content]) => ({ key, ...content }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [searchQuery, selectedCategory]);


  // Get selected item details
  const selectedItemContent = useMemo(() => {
    if (!selectedItem) return null;
    return TOOLTIP_CONTENT[selectedItem] || null;
  }, [selectedItem]);

  // Handle search
  const handleSearch = safeEventHandler((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setSelectedItem(null);
  }, 'HelpPanel', 'search');

  // Handle category change
  const handleCategoryChange = safeEventHandler((category: HelpCategory) => {
    setSelectedCategory(category);
    setSelectedItem(null);
  }, 'HelpPanel', 'categoryChange');

  // Handle item select
  const handleItemSelect = safeEventHandler((key: string) => {
    setSelectedItem(key === selectedItem ? null : key);
  }, 'HelpPanel', 'itemSelect');

  // Format keyboard shortcut
  const formatShortcut = (shortcut: string | undefined): string => {
    if (!shortcut) return '';
    return shortcut
      .replace(/Ctrl\+/g, '⌃')
      .replace(/Shift\+/g, '⇧')
      .replace(/Alt\+/g, '⌥')
      .replace(/Cmd\+/g, '⌘')
      .replace(/\+/g, ' + ');
  };

  return (
    <div 
      className={`flex flex-col h-full bg-slate-950 border-l border-amber-600/30 ${className}`}
      role="complementary"
      aria-label="Help and Documentation"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-amber-600/30 bg-slate-900/50">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-amber-400" aria-hidden="true" />
          <h2 className="text-lg font-bold text-slate-200 leading-tight" id="help-panel-title">
            Help & Documentation
          </h2>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-slate-400 hover:text-slate-200"
            aria-label="Close help panel"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-amber-600/30 bg-slate-900/30">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
          <Input
            type="text"
            placeholder="Search tools, shortcuts, actions..."
            value={searchQuery}
            onChange={handleSearch}
            className="pl-9 bg-slate-900 border-amber-600/30 text-slate-200 placeholder:text-slate-500"
            aria-label="Search help content"
            aria-describedby="help-panel-title"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="all" value={selectedCategory} onValueChange={(v) => handleCategoryChange(v as HelpCategory)} className="h-full flex flex-col">
          <TabsList className="mx-4 mt-2 bg-slate-900/50">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="tool" className="text-xs">Tools</TabsTrigger>
            <TabsTrigger value="action" className="text-xs">Actions</TabsTrigger>
            <TabsTrigger value="viewport" className="text-xs">Viewport</TabsTrigger>
            <TabsTrigger value="navigation" className="text-xs">Navigation</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedCategory} className="flex-1 overflow-hidden m-0 mt-2">
            <div className="flex h-full">
              {/* Left: List */}
              <div className="w-1/2 border-r border-amber-600/30 overflow-hidden flex flex-col">
                <div className="px-4 py-2.5 text-xs text-slate-400 font-semibold bg-slate-900/30 border-b border-amber-600/20">
                  {filteredContent.length} {filteredContent.length === 1 ? 'item' : 'items'} found
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-1">
                    {filteredContent.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 text-sm">
                        No items found. Try a different search.
                      </div>
                    ) : (
                      filteredContent.map((item) => (
                        <button
                          key={item.key}
                          onClick={() => handleItemSelect(item.key)}
                          className={`w-full text-left p-3 rounded-lg transition-all duration-150 ${
                            selectedItem === item.key
                              ? 'bg-amber-500/20 border border-amber-500/40 shadow-sm'
                              : 'bg-slate-900/50 hover:bg-slate-800/50 border border-transparent hover:border-amber-600/20'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-slate-200 text-sm truncate leading-tight">
                                  {item.title}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    item.category === 'tool' ? 'border-blue-500/30 text-blue-400' :
                                    item.category === 'action' ? 'border-green-500/30 text-green-400' :
                                    item.category === 'viewport' ? 'border-purple-500/30 text-purple-400' :
                                    'border-slate-600/30 text-slate-400'
                                  }`}
                                >
                                  {item.category}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                                {item.description}
                              </p>
                              {item.keyboardShortcut && (
                                <div className="mt-1 flex items-center gap-1">
                                  <Keyboard className="h-3 w-3 text-slate-500" />
                                  <span className="text-xs text-slate-500 font-mono">
                                    {formatShortcut(item.keyboardShortcut)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <ChevronRight
                              className={`h-4 w-4 text-slate-400 flex-shrink-0 transition-transform ${
                                selectedItem === item.key ? 'rotate-90' : ''
                              }`}
                            />
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Right: Details */}
              <div className="w-1/2 overflow-hidden flex flex-col">
                {selectedItemContent ? (
                  <ScrollArea className="flex-1">
                    <div className="p-6 space-y-4">
                      <div>
                        <h3 className="text-xl font-bold text-slate-200 mb-3 leading-tight">
                          {selectedItemContent.title}
                        </h3>
                        <Badge
                          variant="outline"
                          className={`${
                            selectedItemContent.category === 'tool' ? 'border-blue-500/30 text-blue-400' :
                            selectedItemContent.category === 'action' ? 'border-green-500/30 text-green-400' :
                            selectedItemContent.category === 'viewport' ? 'border-purple-500/30 text-purple-400' :
                            'border-slate-600/30 text-slate-400'
                          }`}
                        >
                          {selectedItemContent.category}
                        </Badge>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-slate-300 mb-2.5">Description</h4>
                        <p className="text-sm text-slate-400 leading-relaxed font-normal">
                          {selectedItemContent.description}
                        </p>
                      </div>

                      {selectedItemContent.keyboardShortcut && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-300 mb-2.5 flex items-center gap-2">
                            <Keyboard className="h-4 w-4" />
                            Keyboard Shortcut
                          </h4>
                          <div className="bg-slate-900/50 border border-amber-600/20 rounded-lg p-3">
                            <code className="text-sm font-mono text-amber-300 font-medium">
                              {formatShortcut(selectedItemContent.keyboardShortcut)}
                            </code>
                          </div>
                        </div>
                      )}

                      {selectedItemContent.usageExample && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-300 mb-2.5 flex items-center gap-2">
                            <Info className="h-4 w-4" />
                            Usage Example
                          </h4>
                          <div className="bg-slate-900/50 border border-amber-600/20 rounded-lg p-3">
                            <p className="text-sm text-slate-400 leading-relaxed font-normal">
                              {selectedItemContent.usageExample}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center text-slate-400">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">
                        Select an item from the list to view detailed information
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default HelpPanel;

