import { GestureEvent, TouchGestureManager } from '@/lib/input/TouchGestureManager';
import React, { useEffect, useRef } from 'react';

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

/**
 * Higher-Order Component that wraps a component with touch gesture support
 * @param Component - The component to wrap
 * @param config - Gesture configuration (currently passed but not used in this simplified version)
 * @param handlers - Gesture event handlers
 */
export function withTouchGestures<P extends object>(
  Component: React.ComponentType<P>,
  _config: {
    pinchZoom: boolean;
    twoFingerPan: boolean;
    rotate: boolean;
    tapSelect: boolean;
    longPress: boolean;
    swipe: boolean;
    momentum: boolean;
  },
  handlers: GestureHandlers
) {
  return function WithTouchGestures(props: P) {
    // Note: config parameter is accepted for API compatibility but not currently used
    // Future enhancement: pass config to TouchGestureManager
    useTouchGestures(handlers);
    return React.createElement(Component, props);
  };
}
