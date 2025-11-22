/**
 * ClientPortalManager - Main component to manage shared projects
 * Provides interface for sharing projects with clients
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Badge } from '@/shared/ui/ui/badge';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/ui/dialog';
import { Share2, Copy, Mail, ExternalLink, CheckCircle, AlertCircle, X } from 'lucide-react';
import { WindowUnit } from '@/types/fabricator';
import { ProjectSharingService, SharedProject } from './ProjectSharingService';
import { ClientFeedbackForm, ClientComment } from './ClientFeedbackForm';
import { Window3DGenerator } from '@/components/fabricator/Window3DGenerator';

interface ClientPortalManagerProps {
  project: WindowUnit;
  onClose?: () => void;
}

export const ClientPortalManager: React.FC<ClientPortalManagerProps> = ({
  project,
  onClose,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [sharingService] = useState(() => new ProjectSharingService());
  const [sharedProjects, setSharedProjects] = useState<SharedProject[]>([]);
  const [currentShare, setCurrentShare] = useState<SharedProject | null>(null);
  const [clientEmail, setClientEmail] = useState('');
  const [clientName, setClientName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [copied, setCopied] = useState(false);
  const [comments, setComments] = useState<ClientComment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadSharedProjects();
  }, [project.id]);

  const loadSharedProjects = () => {
    const shared = sharingService.getSharedProjectsForProject(project.id);
    setSharedProjects(shared);
  };

  const handleCreateShare = () => {
    if (!clientEmail.trim()) {
      setError('Client email is required');
      return;
    }

    const shared = sharingService.createShareLink(project, {
      clientEmail: clientEmail.trim(),
      clientName: clientName.trim() || undefined,
      expiresInDays,
    });

    setCurrentShare(shared);
    setSharedProjects([...sharedProjects, shared]);
    setError(null);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleCopyLink = async () => {
    if (!currentShare) return;

    try {
      await navigator.clipboard.writeText(currentShare.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setError('Failed to copy link');
    }
  };

  const handleSendEmail = async () => {
    if (!currentShare) return;

    const sent = await sharingService.sendShareNotification(currentShare);
    if (sent) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError('Failed to send email');
    }
  };

  const handleCommentSubmit = (comment: ClientComment) => {
    setComments([...comments, comment]);
  };

  const handleRevoke = (shareToken: string) => {
    if (confirm('Are you sure you want to revoke this share link?')) {
      sharingService.revokeShareLink(shareToken);
      loadSharedProjects();
      if (currentShare?.shareToken === shareToken) {
        setCurrentShare(null);
      }
    }
  };

  const getStatusColor = (status: SharedProject['status']) => {
    const colors: Record<SharedProject['status'], string> = {
      active: 'bg-green-500/20 text-green-400',
      expired: 'bg-gray-500/20 text-gray-400',
      revoked: 'bg-red-500/20 text-red-400',
    };
    return colors[status] || colors.active;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open && onClose) onClose();
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-orange-400" />
            Share Project with Client
          </DialogTitle>
          <DialogDescription>
            Create a secure link to share this project with your client for review and approval.
          </DialogDescription>
        </DialogHeader>

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
              <AlertDescription>Share link created successfully!</AlertDescription>
            </Alert>
          )}

          {/* Create New Share */}
          {!currentShare && (
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle>Create Share Link</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Client Email *</Label>
                    <Input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="client@example.com"
                    />
                  </div>
                  <div>
                    <Label>Client Name</Label>
                    <Input
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Client Name"
                    />
                  </div>
                </div>
                <div>
                  <Label>Link Expires In (Days)</Label>
                  <Input
                    type="number"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(Number(e.target.value))}
                    min={1}
                    max={365}
                  />
                </div>
                <Button
                  onClick={handleCreateShare}
                  className="w-full bg-orange-500 hover:bg-orange-600"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Create Share Link
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Share Link Created */}
          {currentShare && (
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Share Link Created</span>
                  <Badge className={getStatusColor(currentShare.status)}>
                    {currentShare.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Share URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={currentShare.shareUrl}
                      readOnly
                      className="bg-gray-700"
                    />
                    <Button
                      variant="outline"
                      onClick={handleCopyLink}
                      className="flex-shrink-0"
                    >
                      {copied ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleSendEmail}
                      className="flex-shrink-0"
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.open(currentShare.shareUrl, '_blank')}
                      className="flex-shrink-0"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Expires:</span>
                    <div>{currentShare.expiresAt.toLocaleDateString()}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Access Count:</span>
                    <div>{currentShare.accessCount}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Last Accessed:</span>
                    <div>
                      {currentShare.accessedAt
                        ? currentShare.accessedAt.toLocaleDateString()
                        : 'Never'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Existing Shares */}
          {sharedProjects.length > 0 && (
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle>Existing Share Links ({sharedProjects.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sharedProjects.map((shared) => (
                    <div
                      key={shared.id}
                      className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {shared.clientName || shared.clientEmail || 'Anonymous'}
                          </span>
                          <Badge className={getStatusColor(shared.status)}>
                            {shared.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {shared.shareUrl}
                        </div>
                      </div>
                      {shared.status === 'active' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevoke(shared.shareToken)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => {
            setIsOpen(false);
            if (onClose) onClose();
          }}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

