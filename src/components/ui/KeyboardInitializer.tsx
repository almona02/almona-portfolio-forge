import { shortcutManager } from '@/lib/keyboard/shortcuts';
import React, { useEffect, useState } from 'react';
import { ShortcutHelp } from './ShortcutHelp';

export const KeyboardInitializer: React.FC = () => {
    const [helpOpen, setHelpOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Let the manager handle it
            const handled = shortcutManager.handleKeyDown(e);
            if (handled) return;
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Register internal help shortcut
    useEffect(() => {
        const toggleHelp = (e: KeyboardEvent) => {
            e.preventDefault();
            setHelpOpen(prev => !prev);
        };
        
        shortcutManager.register('app.shortcuts-help', toggleHelp);
        shortcutManager.register('app.help', toggleHelp);
        
        return () => {
            shortcutManager.unregister('app.shortcuts-help', toggleHelp);
            shortcutManager.unregister('app.help', toggleHelp);
        };
    }, []);

    return (
        <ShortcutHelp 
            isOpen={helpOpen} 
            onClose={() => setHelpOpen(false)} 
        />
    );
};
