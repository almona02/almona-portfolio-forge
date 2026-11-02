import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { AlertCircle, Calendar, CheckCircle2, Clock, Wrench } from 'lucide-react';
import React from 'react';

export interface TimelineEvent {
    id: string;
    date: string;
    title: string;
    description?: string;
    type: 'installation' | 'maintenance' | 'repair' | 'alert' | 'audit';
    status: 'completed' | 'pending' | 'scheduled' | 'failed';
    technician?: string;
}

interface ServiceTimelineProps {
    events: TimelineEvent[];
    className?: string;
}

const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
        case 'installation': return <CheckCircle2 className="w-5 h-5 text-success" />;
        case 'maintenance': return <Wrench className="w-5 h-5 text-info" />;
        case 'repair': return <AlertCircle className="w-5 h-5 text-destructive" />;
        case 'audit': return <Calendar className="w-5 h-5 text-amber-400" />;
        case 'alert': return <AlertCircle className="w-5 h-5 text-amber-400" />;
        default: return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
};

const getStatusColor = (status: TimelineEvent['status']) => {
    switch (status) {
        case 'completed': return 'bg-green-500/10 text-success border-green-500/20';
        case 'pending': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
        case 'scheduled': return 'bg-blue-500/10 text-info border-blue-500/20';
        case 'failed': return 'bg-red-500/10 text-destructive border-red-500/20';
        default: return 'bg-muted/10 text-muted-foreground border-border/20';
    }
};

export const ServiceTimeline: React.FC<ServiceTimelineProps> = ({ events, className }) => {
    // Sort events by date descending
    const sortedEvents = [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <Card className={cn("bg-card border-border/10", className)}>
            <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Clock className="w-5 h-5 text-almona-orange" />
                    Service Timeline
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="relative pl-6 border-l border-border/10 space-y-8">
                    {sortedEvents.length === 0 && (
                        <p className="text-muted-foreground text-sm italic">No history available for this asset.</p>
                    )}

                    {sortedEvents.map((event) => (
                        <div key={event.id} className="relative group">
                            {/* Dot on the timeline */}
                            <div className={cn(
                                "absolute -left-[29px] w-3 h-3 rounded-full border-2 border-almona-darker mt-1.5 transition-all group-hover:scale-125",
                                event.status === 'completed' ? "bg-green-500" :
                                    event.status === 'scheduled' ? "bg-blue-500" :
                                        event.status === 'failed' ? "bg-red-500" : "bg-muted"
                            )} />

                            <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-mono text-muted-foreground">
                                        {new Date(event.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </span>
                                    <Badge variant="outline" className={cn("text-xs capitalize", getStatusColor(event.status))}>
                                        {event.status}
                                    </Badge>
                                </div>

                                <h4 className="text-base font-semibold text-foreground flex items-center gap-2">
                                    {getEventIcon(event.type)}
                                    {event.title}
                                </h4>

                                {event.description && (
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                        {event.description}
                                    </p>
                                )}

                                {event.technician && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <span className="flex items-center gap-2 mt-2 text-xs text-muted-foreground cursor-help">
                                                    <Wrench className="w-3 h-3" />
                                                    Technician: <span className="text-foreground">{event.technician}</span>
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Service performed by verified technician</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};
