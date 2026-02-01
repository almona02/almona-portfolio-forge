import { GestureEvent, TouchGestureManager } from '@/lib/input/TouchGestureManager';
import { useEffect, useRef } from 'react';

export interface GestureHandlers {
    onTap?: (e: GestureEvent) => void;
    onDoubleTap?: (e: GestureEvent) => void;
    onLongPress?: (e: GestureEvent) => void;
    onPan?: (e: GestureEvent) => void;
    onPinch?: (e: GestureEvent) => void;
}

export function useTouchGestures<T extends HTMLElement>(handlers: GestureHandlers) {
    const ref = useRef<T>(null);
    const managerRef = useRef<TouchGestureManager | null>(null);

    // Keep handlers fresh without re-binding
    const handlersRef = useRef(handlers);
    useEffect(() => {
        handlersRef.current = handlers;
    });

    useEffect(() => {
        if (!ref.current) return;

        const manager = new TouchGestureManager();
        manager.attach(ref.current);
        managerRef.current = manager;

        // Bind events
        manager.on('tap', (e) => handlersRef.current.onTap?.(e));
        manager.on('doubleTap', (e) => handlersRef.current.onDoubleTap?.(e));
        manager.on('longPress', (e) => handlersRef.current.onLongPress?.(e));
        manager.on('pan', (e) => handlersRef.current.onPan?.(e));
        manager.on('pinch', (e) => handlersRef.current.onPinch?.(e));

        return () => {
            manager.detach();
        };
    }, []); // Only run once on mount

    return ref;
}
