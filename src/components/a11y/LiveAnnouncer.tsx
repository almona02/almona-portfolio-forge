import React, { createContext, useCallback, useContext, useState } from 'react';

type AnnouncementPoliteness = 'polite' | 'assertive' | 'off';

interface LiveAnnouncerContextType {
    announce: (message: string, politeness?: AnnouncementPoliteness) => void;
}

const LiveAnnouncerContext = createContext<LiveAnnouncerContextType | undefined>(undefined);

export const useLiveAnnouncer = () => {
    const context = useContext(LiveAnnouncerContext);
    if (!context) {
        throw new Error('useLiveAnnouncer must be used within a LiveAnnouncerProvider');
    }
    return context;
};

export const LiveAnnouncerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [announcement, setAnnouncement] = useState<{ message: string; politeness: AnnouncementPoliteness } | null>(null);

    const announce = useCallback((message: string, politeness: AnnouncementPoliteness = 'polite') => {
        // Clear first to ensure screen readers re-announce if message is same
        setAnnouncement(null);
        setTimeout(() => {
            setAnnouncement({ message, politeness });
        }, 50);
    }, []);

    return (
        <LiveAnnouncerContext.Provider value={{ announce }}>
            {children}
            {/* Visually Hidden Live Regions */}
            <div className="sr-only">
                <div role="log" aria-live="polite" aria-atomic="true">
                    {announcement?.politeness === 'polite' && announcement.message}
                </div>
                <div role="alert" aria-live="assertive" aria-atomic="true">
                    {announcement?.politeness === 'assertive' && announcement.message}
                </div>
            </div>
        </LiveAnnouncerContext.Provider>
    );
};
