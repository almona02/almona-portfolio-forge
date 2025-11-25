import React, { useState } from 'react';
import { Button } from '@/shared/ui/ui/button';
import { X } from 'lucide-react';
import { track } from '@/lib/analytics';
import { toast } from 'sonner';

interface FeedbackButtonProps {
  jobId?: string;
}

export const FeedbackButton: React.FC<FeedbackButtonProps> = ({ jobId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
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
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 z-40">
        <Button
          variant="outline"
          size="sm"
          className="bg-orange-500 hover:bg-orange-600 border-orange-400 text-xs"
          onClick={() => setIsOpen(true)}
        >
          💡 Found an issue?
        </Button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-xl p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-100">
                Fabricator Pro Feedback
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-gray-400 mb-3">
              Tell us what felt slow, confusing, or missing while using this workspace.
            </p>

            <textarea
              className="w-full h-28 rounded-md bg-gray-800 border border-gray-700 text-xs text-gray-100 p-2 focus:outline-none focus:ring-2 focus:ring-orange-500/60 focus:border-orange-500/60 resize-none"
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
                className="bg-orange-500 hover:bg-orange-600 text-xs"
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

export default FeedbackButton;


