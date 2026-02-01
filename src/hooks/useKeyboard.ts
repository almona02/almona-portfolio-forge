import { KeyHandler, ShortcutConfig, keyboardManager } from '@/lib/input/KeyboardManager';
import { useEffect } from 'react';

export interface UseKeyboardOptions {
  context?: string;
  enable?: boolean;
}

export const useKeyboard = (
  shortcuts: Record<string, KeyHandler | { action: KeyHandler; description: string }>,
  options: UseKeyboardOptions = {}
) => {
  const { context = 'global', enable = true } = options;

  useEffect(() => {
    if (!enable) return;

    // Register context if not global
    // Note: Manager manages sets, so idempotent
    keyboardManager.setContext(context, true);

    const unregisterFns: (() => void)[] = [];

    Object.entries(shortcuts).forEach(([key, value]) => {
      const config: ShortcutConfig = {
        id: `${context}-${key}-${Math.random()}`,
        keys: key,
        action: typeof value === 'function' ? value : value.action,
        description: typeof value === 'function' ? '' : value.description,
        context
      };

      const unsub = keyboardManager.register(config);
      unregisterFns.push(unsub);
    });

    return () => {
      unregisterFns.forEach(fn => fn());
      // Only remove context if we were the last one? 
      // KeyboardManager setContext just adds/removes to Set. 
      // If multiple components use same context, we might remove it prematurely if we just delete?
      // For now, assuming context is tied to component lifecycle is fine. 
      // If 'drafting' context is used by multiple components, we should likely refcount context?
      // Or just leave it active?
      // Better: KeyboardManager should count references or we just manually manage 'active' status.
      // For this implementation, we'll assume unmounting toggles it off.
      keyboardManager.setContext(context, false);
    };
  }, [context, enable, shortcuts]);
};
