import { Prestige3DLoader } from './Prestige3DLoader';

// ... (keep existing imports)

export const PageLoading: React.FC<PageLoadingProps> = ({
  className,
  message = 'Loading page...',
  showProgress = false,
  progress = 0,
  variant = 'default'
}) => {
  const styles = variantStyles[variant];

  if (variant === 'fullscreen') {
    return (
      <Prestige3DLoader
        variant="fullscreen"
        loadingSteps={[{ progress: 100, message: message }]}
        show3DAnimation={true}
      >
        {/* Children are rendered inside but hidden during load usually, 
            but here PageLoading is used as a fallback, so it doesn't wrap children directly in the same way.
            However, Prestige3DLoader expects children to reveal. 
            Since PageLoading is often used as a Suspense fallback, it might not have children.
            We'll pass a dummy div or null. 
        */}
        <div />
      </Prestige3DLoader>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center space-y-4 p-8',
        styles.container,
        className
      )}
      role="status"
      aria-label={message}
    >
      <div className="relative">
        <Globe className={cn('h-8 w-8 animate-pulse', styles.icon)} />
        <ArrowRight className={cn(
          'absolute -top-1 -right-1 h-4 w-4 animate-bounce',
          styles.icon
        )} />
      </div>

      <div className="text-center">
        <p className={cn('text-sm font-medium', styles.text)}>
          {message}
        </p>

        {showProgress && (
          <div className="w-32 bg-[#0f0f0f]/80 border border-amber-600/30 rounded-full h-1 mt-2">
            <div
              className="bg-gradient-to-r from-amber-400 to-amber-600 h-1 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}
      </div>

      <span className="sr-only">{message}</span>
    </div>
  );
};

export default PageLoading;
