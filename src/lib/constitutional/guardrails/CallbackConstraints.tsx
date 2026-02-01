/**
 * Callback Constraints - Guardrail A
 * AICS-001 §5.4: Advisory components may emit data, never intent
 * 
 * Prevents advisory components from having callbacks that imply execution authority.
 */

/**
 * Intent callback names that are FORBIDDEN in advisory components
 * These imply execution authority which violates Tier 2 boundaries
 */
export const FORBIDDEN_CALLBACK_NAMES = [
    'onApprove',
    'onApply',
    'onAccept',
    'onExecute',
    'onConfirm',
    'onSubmit',
    'onCommit',
    'onAuthorize',
    'onValidate',  // implies authority to validate
    'onFinalize',
] as const;

/**
 * Data callback names that are ALLOWED in advisory components
 * These emit data only, no implied authority
 */
export const ALLOWED_CALLBACK_NAMES = [
    'onData',
    'onUpdate',
    'onChange',
    'onSelect',
    'onCompare',
    'onPreview',
    'onHover',
    'onFocus',
    'onBlur',
    'onDismiss',
    'onClose',
] as const;

export type ForbiddenCallbackName = typeof FORBIDDEN_CALLBACK_NAMES[number];
export type AllowedCallbackName = typeof ALLOWED_CALLBACK_NAMES[number];

export interface CallbackValidationResult {
    valid: boolean;
    violation?: string;
    message?: string;
    remediation?: string;
}

/**
 * Validate that a callback name is data-only, not intent
 */
export function validateCallbackName(callbackName: string): CallbackValidationResult {
    const isForbidden = FORBIDDEN_CALLBACK_NAMES.some(
        forbidden => callbackName.toLowerCase().startsWith(forbidden.toLowerCase())
    );

    if (isForbidden) {
        return {
            valid: false,
            violation: 'INTENT_CALLBACK_IN_ADVISORY',
            message: `Advisory component cannot emit intent via "${callbackName}"`,
            remediation: 'Change to data-only callback (onDataUpdate, onSelectionChange, etc.)'
        };
    }

    return { valid: true };
}

/**
 * Validate all callbacks in a props object
 */
export function validatePropsCallbacks(props: Record<string, unknown>): CallbackValidationResult[] {
    const results: CallbackValidationResult[] = [];

    for (const key of Object.keys(props)) {
        if (typeof props[key] === 'function' && key.startsWith('on')) {
            results.push(validateCallbackName(key));
        }
    }

    return results;
}

/**
 * Check if props have any forbidden callbacks
 */
export function hasIntentCallbacks(props: Record<string, unknown>): boolean {
    return validatePropsCallbacks(props).some(r => !r.valid);
}

/**
 * Type helper to make intent callbacks result in TypeScript errors
 * Use this as a base for advisory component props
 */
export type AdvisoryPropsConstraint = {
    // Forbidden - will cause TypeScript error if used
    onApprove?: never;
    onApply?: never;
    onAccept?: never;
    onExecute?: never;
    onConfirm?: never;
    onSubmit?: never;
    onCommit?: never;
    onAuthorize?: never;
    onFinalize?: never;
};

/**
 * Helper to create type-safe advisory props
 * Combines your props with the forbidden callback constraints
 */
export type SafeAdvisoryProps<T> = T & AdvisoryPropsConstraint;

/**
 * Runtime wrapper that validates callbacks and logs violations
 */
export function wrapWithCallbackValidation<P extends Record<string, unknown>>(
    Component: React.ComponentType<P>,
    componentName: string
): React.ComponentType<P> {
    return function ValidatedComponent(props: P) {
        // Validate on every render in development
        if (process.env.NODE_ENV === 'development') {
            const violations = validatePropsCallbacks(props as Record<string, unknown>)
                .filter(r => !r.valid);

            if (violations.length > 0) {
                console.error(
                    `[CallbackConstraint] ${componentName} has forbidden callbacks:`,
                    violations.map(v => v.message).join(', ')
                );
            }
        }

        return <Component {...props} />;
    };
}

// Need React import for the wrapper
import React from 'react';
