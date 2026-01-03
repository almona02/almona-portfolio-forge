/**
 * ClientFeedbackForm - Allows clients to add comments/approvals
 */

import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Label } from '@/shared/ui/ui/label';
import { Textarea } from '@/shared/ui/ui/textarea';
import { AlertCircle, CheckCircle, MessageSquare, Send, XCircle } from 'lucide-react';
import React, { useState } from 'react';

export interface ClientComment {
  id: string;
  componentId?: string;
  componentName?: string;
  comment: string;
  type: 'comment' | 'approval' | 'rejection' | 'question';
  createdAt: Date;
  clientName?: string;
  clientEmail?: string;
  resolved?: boolean;
}

interface ClientFeedbackFormProps {
  projectId: string;
  components?: Array<{ id: string; name: string }>;
  onCommentSubmit: (comment: ClientComment) => void;
  existingComments?: ClientComment[];
  canApprove?: boolean;
  canComment?: boolean;
}

export const ClientFeedbackForm: React.FC<ClientFeedbackFormProps> = ({
  projectId: _projectId,
  components = [],
  onCommentSubmit,
  existingComments = [],
  canApprove = true,
  canComment = true,
}) => {
  const [comment, setComment] = useState('');
  const [selectedComponent, setSelectedComponent] = useState<string>('');
  const [commentType, setCommentType] = useState<ClientComment['type']>('comment');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!comment.trim()) {
      setError('Please enter a comment');
      return;
    }

    if (commentType === 'approval' && !canApprove) {
      setError('You do not have permission to approve');
      return;
    }

    if (commentType !== 'approval' && !canComment) {
      setError('You do not have permission to comment');
      return;
    }

    const newComment: ClientComment = {
      id: `comment_${Date.now()}`,
      componentId: selectedComponent || undefined,
      componentName: components.find((c) => c.id === selectedComponent)?.name,
      comment,
      type: commentType,
      createdAt: new Date(),
      clientName: clientName || undefined,
      clientEmail: clientEmail || undefined,
      resolved: false,
    };

    onCommentSubmit(newComment);
    setComment('');
    setSelectedComponent('');
    setCommentType('comment');
    setError(null);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const getCommentTypeColor = (type: ClientComment['type']) => {
    const colors: Record<ClientComment['type'], string> = {
      comment: 'bg-blue-500/20 text-blue-400',
      approval: 'bg-green-500/20 text-green-400',
      rejection: 'bg-red-500/20 text-red-400',
      question: 'bg-yellow-500/20 text-yellow-400',
    };
    return colors[type] || colors.comment;
  };

  const getCommentTypeIcon = (type: ClientComment['type']) => {
    switch (type) {
      case 'approval':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejection':
        return <XCircle className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive" className="bg-red-900/20 border-red-500">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-900/20 border-green-500">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>Feedback submitted successfully!</AlertDescription>
        </Alert>
      )}

      {/* Comment Form */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-orange-400" />
            Add Feedback
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Client Info (optional) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Your Name (Optional)</Label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label>Your Email (Optional)</Label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                placeholder="john@example.com"
              />
            </div>
          </div>

          {/* Component Selection (if available) */}
          {components.length > 0 && (
            <div>
              <Label>Component (Optional)</Label>
              <select
                value={selectedComponent}
                onChange={(e) => setSelectedComponent(e.target.value)}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
              >
                <option value="">General Comment</option>
                {components.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Comment Type */}
          <div>
            <Label>Feedback Type</Label>
            <div className="flex gap-2 mt-2">
              <Button
                variant={commentType === 'comment' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCommentType('comment')}
                disabled={!canComment}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Comment
              </Button>
              <Button
                variant={commentType === 'approval' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCommentType('approval')}
                disabled={!canApprove}
                className={commentType === 'approval' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                variant={commentType === 'rejection' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCommentType('rejection')}
                disabled={!canComment}
                className={commentType === 'rejection' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                variant={commentType === 'question' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCommentType('question')}
                disabled={!canComment}
              >
                Question
              </Button>
            </div>
          </div>

          {/* Comment Text */}
          <div>
            <Label>Your Feedback</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Enter your feedback, questions, or approval..."
              className="min-h-[120px] bg-gray-700 border-gray-600 text-white"
            />
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full bg-orange-500 hover:bg-orange-600"
            disabled={!comment.trim()}
          >
            <Send className="h-4 w-4 mr-2" />
            Submit Feedback
          </Button>
        </CardContent>
      </Card>

      {/* Existing Comments */}
      {existingComments.length > 0 && (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle>Previous Feedback ({existingComments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {existingComments.map((c) => (
                <div key={c.id} className="p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getCommentTypeIcon(c.type)}
                      <Badge className={getCommentTypeColor(c.type)}>{c.type}</Badge>
                      {c.componentName && (
                        <Badge variant="outline">{c.componentName}</Badge>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {c.createdAt.toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300">{c.comment}</p>
                  {c.clientName && (
                    <p className="text-xs text-gray-400 mt-2">— {c.clientName}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

