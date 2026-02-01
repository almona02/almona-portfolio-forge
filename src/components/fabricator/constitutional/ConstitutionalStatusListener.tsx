
import { useToast } from '@/hooks/use-toast';
import { RealityOSEvent } from '@/lib/constitutional/PositionStateSyncService';
import { useEffect } from 'react';

/**
 * Constitutional Status Listener
 * 
 * Listens for system-wide constitutional events and provides precision UI feedback.
 * Handles degraded mode notifications and rate limit warnings.
 * 
 * @constitutional_compliance AICS-001 §9.3.V (Transparency)
 */
export function ConstitutionalStatusListener() {
    const { toast } = useToast();

    useEffect(() => {
        // Handler for RealityOS events
        const handleEvent = (event: Event) => {
            const customEvent = event as CustomEvent<RealityOSEvent>;
            const payload = customEvent.detail;

            if (!payload) return;

            switch (payload.type) {
                case 'SYSTEM_DEGRADED':
                    toast({
                        title: "System Degraded",
                        description: "Persistence failure detected. Switching to memory-only mode. Your work is safe locally but may not persist after reload.",
                        variant: "destructive",
                    });
                    break;

                case 'RATE_LIMIT_EXCEEDED':
                    toast({
                        title: "Rate Limit Exceeded",
                        description: "You are making too many requests. Please slow down to ensure system stability.",
                        variant: "destructive",
                    });
                    break;

                case 'CONSTITUTIONAL_VIOLATION':
                    // Only show for non-critical violations that might not crash the app
                    if (payload.severity !== 'CRITICAL') {
                        toast({
                            title: "Constitutional Violation",
                            description: `AICS-001 Violation: ${payload.error || 'Unknown error'}`,
                            variant: "destructive",
                        });
                    }
                    break;
            }
        };

        // Listen to window events
        window.addEventListener('reality-os-event', handleEvent);

        return () => {
            window.removeEventListener('reality-os-event', handleEvent);
        };
    }, [toast]);

    return null; // Headless component
}
