/**
 * Feedback Widget - In-App Feedback Collection
 * 
 * Low-friction feedback widget for beta testers to report issues,
 * rate features, and provide suggestions.
 * 
 * @since Phase 2B: Dual-Output Engine (Week 2 - Day 9)
 */

import React, { useState } from 'react';
import { betaTestingFramework } from '@/lib/beta/betaTestingFramework';

interface FeedbackWidgetProps {
  feature: string;
  context?: string;
}

export const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({ feature, context }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [comments, setComments] = useState('');
  const [issues, setIssues] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    if (!rating) {
      alert('Please provide a rating');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Get tester ID from context or generate
      const testerId = context || 'anonymous';
      
      const feedback = {
        testerId,
        feature,
        rating: rating as 1 | 2 | 3 | 4 | 5,
        comments: comments.trim() || undefined,
        issues: issues.filter(i => i.trim()),
        suggestions: suggestions.filter(s => s.trim())
      };
      
      // Submit to beta testing framework
      await betaTestingFramework.submitFeedback(feedback);
      
      // Reset form
      setRating(null);
      setComments('');
      setIssues([]);
      setSuggestions([]);
      setIsOpen(false);
      
      alert('Thank you for your feedback!');
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const StarIcon = ({ filled }: { filled: boolean }) => (
    <span className={`text-2xl ${filled ? 'text-yellow-400' : 'text-gray-300'}`}>
      ★
    </span>
  );
  
  const MessageSquareIcon = () => (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
  
  const XIcon = () => (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
  
  return (
    <>
      {/* Feedback button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        title="Send feedback"
      >
        <MessageSquareIcon />
      </button>
      
      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Feedback: {feature}</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XIcon />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Rating */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    How would you rate this feature?
                  </label>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className={`p-2 rounded ${
                          rating === star
                            ? 'bg-yellow-100 text-yellow-600'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        <StarIcon filled={rating !== null && star <= rating} />
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Comments */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comments (optional)
                  </label>
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="What did you like or dislike?"
                  />
                </div>
                
                {/* Issues */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Did you encounter any issues?
                  </label>
                  <div className="space-y-2">
                    {['Slow performance', 'Inaccurate visualization', 'Missing features', 'Bugs/Errors'].map((issue) => (
                      <label key={issue} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={issues.includes(issue)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setIssues([...issues, issue]);
                            } else {
                              setIssues(issues.filter(i => i !== issue));
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">{issue}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                {/* Suggestions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Suggestions for improvement
                  </label>
                  <textarea
                    value={suggestions.join('\n')}
                    onChange={(e) => setSuggestions(e.target.value.split('\n').filter(s => s.trim()))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="What would make this feature better?"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !rating}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                    isSubmitting || !rating
                      ? 'bg-blue-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

