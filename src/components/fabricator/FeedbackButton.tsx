import ErrorBoundary from '@/components/ErrorBoundary';
import React, { memo, useCallback, useState } from 'react';
import { Button } from '@/shared/ui/ui/button';
import { X } from 'lucide-react';
import { track } from '@/lib/analytics';
import { toast } from 'sonner';

interface FeedbackButtonProps {
  jobId?: string;
}

const FeedbackButtonComponent: React.FC<FeedbackButtonProps> = ({ jobId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');

  // ✅ PERFORMANCE: Memoize handler to prevent unnecessary re-renders
  const handleSubmit = useCallback(() => {
    if (!message.trim()) {
      toast.error('Please add a short note before sending feedback.');
      return;
    }

    track('fabricator_feedback_submitted', {
      jobId: jobId || null,
      message,
      origin: 'fabricator_workflow',
    });

    toast.success('Feedback sent. Thank you!');
    setMessage('');
    setIsOpen(false);
  }, [jobId, message]);

  return (
    <>
      <div className="fixed bottom-4 right-4 z-40">
        <Button
          variant="outline"
          size="sm"
          className="btn-primary"
          onClick={() => setIsOpen(true)}
        >
          💡 Found an issue?
        </Button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-background border border-border rounded-xl p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="typography-h2 text-sm font-semibold text-foreground">
                Fabricator Pro Feedback
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground mb-3">
              Tell us what felt slow, confusing, or missing while using this workspace.
            </p>

            <textarea
              className="w-full h-28 rounded-md bg-card border border-border text-xs text-foreground p-2 focus:outline-none focus:ring-2 focus:ring-amber-500/60 resize-none card-premium"
              placeholder="Example: When I tried to move a job from design to optimization, I wasn't sure which button to use..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            <div className="mt-3 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="btn-primary"
                onClick={handleSubmit}
              >
                Send Feedback
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

FeedbackButtonComponent.displayName = 'FeedbackButton';

// ✅ HARDENING: Memoize component for performance
const FeedbackButtonMemo = memo(FeedbackButtonComponent);

// ✅ HARDENING: Export with error boundary for production
export const FeedbackButton: React.FC<FeedbackButtonProps> = (props) => (
  <ErrorBoundary level="component">
    <FeedbackButtonMemo {...props} />
  </ErrorBoundary>
);

FeedbackButton.displayName = 'FeedbackButton';

export default FeedbackButton;


