// Type shim so TypeScript recognizes the <model-viewer> web component attributes
// For deeper typing you could import types from '@google/model-viewer' when available.

declare module '@google/model-viewer';

declare namespace JSX {
  interface IntrinsicElements {
    'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      src?: string;
      'ios-src'?: string;
      poster?: string;
      alt?: string;
      ar?: '' | boolean;
      'ar-modes'?: string;
      'camera-controls'?: '' | boolean;
      'auto-rotate'?: '' | boolean;
      exposure?: string | number;
      'shadow-intensity'?: string | number;
      autoplay?: '' | boolean;
      loading?: 'auto' | 'lazy' | 'eager';
      reveal?: 'auto' | 'interaction';
      style?: React.CSSProperties;
      class?: string;
    };
  }
}
