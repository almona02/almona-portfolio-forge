interface Window {
  dataLayer: unknown[];
  gtag: (...args: unknown[]) => void;
}

declare function gtag(...args: unknown[]): void;
