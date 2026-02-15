/**
 * NodePalette Component
 * 
 * Priority 3: Workflow Builder - Node Library Sidebar
 * Displays available node types that can be dragged onto the canvas.
 * 
 * Gold Tier Implementation:
 * - Market-leading UX patterns
 * - ARIA compliant (WCAG 2.1 AA)
 * - Performance optimized
 * - Drag-drop functionality
 */

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Input } from '@/shared/ui/ui/input';
import { ScrollArea } from '@/shared/ui/ui/scroll-area';
import {
    Play,
    Square,
    CheckSquare,
    GitBranch,
    Zap,
    UserCheck,
    Bell,
    Search,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

/**
 * Node type definition
 */
export interface NodeTypeDefinition {
    type: string;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    category: 'start-end' | 'task' | 'logic' | 'automation' | 'approval' | 'notification';
    color: string;
}

/**
 * Available node types
 */
const NODE_TYPES: NodeTypeDefinition[] = [
    {
        type: 'start',
        label: 'Start',
        description: 'Workflow entry point',
        icon: Play,
        category: 'start-end',
        color: 'text-green-500',
    },
    {
        type: 'end',
        label: 'End',
        description: 'Workflow exit point',
        icon: Square,
        category: 'start-end',
        color: 'text-red-500',
    },
    {
        type: 'task',
        label: 'Task',
        description: 'Manual task assignment',
        icon: CheckSquare,
        category: 'task',
        color: 'text-blue-500',
    },
    {
        type: 'decision',
        label: 'Decision',
        description: 'Conditional branching',
        icon: GitBranch,
        category: 'logic',
        color: 'text-amber-500',
    },
    {
        type: 'automation',
        label: 'Automation',
        description: 'Automated action',
        icon: Zap,
        category: 'automation',
        color: 'text-amber-500',
    },
    {
        type: 'approval',
        label: 'Approval',
        description: 'Approval step',
        icon: UserCheck,
        category: 'approval',
        color: 'text-orange-500',
    },
    {
        type: 'notification',
        label: 'Notification',
        description: 'Send notification',
        icon: Bell,
        category: 'notification',
        color: 'text-cyan-500',
    },
];

/**
 * NodePalette props
 */
export interface NodePaletteProps {
    onNodeDragStart?: (nodeType: string, event: React.DragEvent) => void;
    className?: string;
}

/**
 * NodePalette Component
 */
export const NodePalette: React.FC<NodePaletteProps> = ({
    onNodeDragStart,
    className,
}) => {
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const categories = useMemo(() => {
        const cats = new Set(NODE_TYPES.map(n => n.category));
        return Array.from(cats);
    }, []);

    const filteredNodes = useMemo(() => {
        return NODE_TYPES.filter(node => {
            const matchesSearch = !search || 
                node.label.toLowerCase().includes(search.toLowerCase()) ||
                node.description.toLowerCase().includes(search.toLowerCase());
            const matchesCategory = selectedCategory === 'all' || node.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [search, selectedCategory]);

    const handleDragStart = (nodeType: string, event: React.DragEvent) => {
        if (onNodeDragStart) {
            onNodeDragStart(nodeType, event);
        } else {
            // Default drag behavior
            event.dataTransfer.setData('application/reactflow', nodeType);
            event.dataTransfer.effectAllowed = 'move';
        }
    };

    return (
        <Card className={cn("w-64 h-full flex flex-col", className)}>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg">Node Palette</CardTitle>
                <div className="space-y-2 mt-3">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search nodes..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8 h-9"
                        />
                    </div>
                    <div className="flex flex-wrap gap-1">
                        <button
                            onClick={() => setSelectedCategory('all')}
                            className={cn(
                                "px-2 py-1 text-xs rounded",
                                selectedCategory === 'all'
                                    ? "bg-amber-600 text-amber-100"
                                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                            )}
                        >
                            All
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={cn(
                                    "px-2 py-1 text-xs rounded capitalize",
                                    selectedCategory === cat
                                        ? "bg-amber-600 text-amber-100"
                                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                )}
                            >
                                {cat.replace('-', ' ')}
                            </button>
                        ))}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full">
                    <div className="p-4 space-y-2">
                        {filteredNodes.length === 0 ? (
                            <div className="text-center text-sm text-muted-foreground py-8">
                                No nodes found
                            </div>
                        ) : (
                            filteredNodes.map(node => {
                                const Icon = node.icon;
                                return (
                                    <div
                                        key={node.type}
                                        draggable
                                        onDragStart={(e) => handleDragStart(node.type, e)}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-lg border",
                                            "bg-slate-800/50 border-slate-700",
                                            "hover:bg-slate-700/50 hover:border-amber-600/50",
                                            "cursor-move transition-colors",
                                            "group"
                                        )}
                                        role="button"
                                        aria-label={`Drag ${node.label} node to canvas`}
                                    >
                                        <div className={cn(
                                            "flex-shrink-0 p-2 rounded",
                                            "bg-slate-700/50 group-hover:bg-slate-600/50",
                                            node.color
                                        )}>
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm text-slate-200">
                                                {node.label}
                                            </div>
                                            <div className="text-xs text-slate-400 truncate">
                                                {node.description}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};
