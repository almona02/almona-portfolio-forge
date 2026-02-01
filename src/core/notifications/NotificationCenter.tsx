/**
 * Notification Center Component
 * 
 * Gold-tier notification center UI component for displaying and managing notifications.
 * Provides real-time updates, filtering, and mark-as-read functionality.
 * 
 * Features:
 * - Real-time notification updates
 * - Unread count badge
 * - Notification list with filtering
 * - Mark as read functionality
 * - Prestige theme styling
 * - Activity logging integration
 * 
 * Usage:
 * ```tsx
 * <NotificationCenter userId={user.id} />
 * ```
 */

import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/shared/ui/ui/popover';
import { ScrollArea } from '@/shared/ui/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { formatDistanceToNow } from 'date-fns';
import * as Icons from 'lucide-react';
import {
    Bell,
    Check,
    CheckCheck,
    Mail,
    MessageSquare,
    Smartphone,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { NotificationService } from './NotificationService';
import type { Notification, NotificationChannel } from './notificationTypes';
import { getNotificationColor, getNotificationIcon } from './notificationTypes';

interface NotificationCenterProps {
  /** User ID */
  userId: string;
  /** Show as popover (default) or full panel */
  variant?: 'popover' | 'panel';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Notification Center Component
 */
export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  userId,
  variant = 'popover',
  className,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [channelFilter, setChannelFilter] = useState<NotificationChannel | 'all'>('all');
  const [isOpen, setIsOpen] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await NotificationService.getUserNotifications(
        userId,
        filter === 'unread',
        50
      );
      setNotifications(data);
    } catch {
      console.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [userId, filter]);

  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await NotificationService.getUnreadCount(userId);
      setUnreadCount(count);
    } catch (_error) {
      // Silently handle errors - notifications table may not be set up yet
      // Don't spam console with errors if the table doesn't exist
      setUnreadCount(0);
    }
  }, [userId]);

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
    
    // Set up real-time subscription
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadNotifications();
          loadUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadNotifications();
          loadUnreadCount();
        }
      )
      .subscribe();

    // Poll for updates every 30 seconds as fallback
    const interval = setInterval(() => {
      loadNotifications();
      loadUnreadCount();
    }, 30000);

    return () => {
      channel.unsubscribe();
      clearInterval(interval);
    };
  }, [userId, loadNotifications, loadUnreadCount]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await NotificationService.markAsRead(notificationId);
      await loadNotifications();
      await loadUnreadCount();
    } catch {
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await NotificationService.markAllAsRead(userId);
      await loadNotifications();
      await loadUnreadCount();
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all notifications as read');
    }
  };

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;
    
    if (channelFilter !== 'all') {
      filtered = filtered.filter(n => n.channel === channelFilter);
    }
    
    return filtered;
  }, [notifications, channelFilter]);

  const renderIcon = (type: string) => {
    const iconName = getNotificationIcon(type);
    const IconComponent = (Icons as any)[iconName] || Icons.Bell;
    const colorClass = getNotificationColor(type, filteredNotifications.find(n => n.type === type)?.priority);
    
    return <IconComponent className={cn('w-4 h-4', colorClass)} />;
  };

  const renderChannelIcon = (channel: NotificationChannel) => {
    const icons = {
      email: Mail,
      in_app: Bell,
      push: Smartphone,
      sms: MessageSquare,
    };
    const Icon = icons[channel] || Bell;
    return <Icon className="w-3 h-3" />;
  };

  // Popover variant
  if (variant === 'popover') {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'relative border-amber-600/30 text-amber-300 hover:bg-amber-500/10',
              className
            )}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-red-500"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[400px] p-0 bg-[#0f0f0f] border-amber-600/30"
          align="end"
        >
          <NotificationList
            notifications={filteredNotifications}
            loading={loading}
            onMarkAsRead={handleMarkAsRead}
            onMarkAllAsRead={handleMarkAllAsRead}
            unreadCount={unreadCount}
            filter={filter}
            channelFilter={channelFilter}
            onFilterChange={setFilter}
            onChannelFilterChange={setChannelFilter}
            renderIcon={renderIcon}
            renderChannelIcon={renderChannelIcon}
          />
        </PopoverContent>
      </Popover>
    );
  }

  // Panel variant
  return (
    <Card className={cn('bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-amber-200 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="bg-red-500 text-white">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10 text-xs"
            >
              <CheckCheck className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <NotificationList
          notifications={filteredNotifications}
          loading={loading}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
          unreadCount={unreadCount}
          filter={filter}
          channelFilter={channelFilter}
          onFilterChange={setFilter}
          onChannelFilterChange={setChannelFilter}
          renderIcon={renderIcon}
          renderChannelIcon={renderChannelIcon}
        />
      </CardContent>
    </Card>
  );
};

/**
 * Notification List Component
 */
interface NotificationListProps {
  notifications: Notification[];
  loading: boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  unreadCount: number;
  filter: 'all' | 'unread';
  channelFilter: NotificationChannel | 'all';
  onFilterChange: (filter: 'all' | 'unread') => void;
  onChannelFilterChange: (filter: NotificationChannel | 'all') => void;
  renderIcon: (type: string) => React.ReactNode;
  renderChannelIcon: (channel: NotificationChannel) => React.ReactNode;
}

const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  loading,
  onMarkAsRead,
  onMarkAllAsRead,
  unreadCount,
  filter,
  channelFilter: _channelFilter,
  onFilterChange,
  onChannelFilterChange: _onChannelFilterChange,
  renderIcon,
  renderChannelIcon,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-12">
        <Bell className="w-16 h-16 text-amber-600/20 mx-auto mb-4" />
        <p className="text-sm font-medium text-amber-300/70 mb-1">No notifications</p>
        <p className="text-xs text-amber-600/50">
          {filter === 'unread' ? 'All caught up!' : 'You have no notifications yet.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-[600px]">
      {/* Filters */}
      <div className="p-4 border-b border-amber-600/20 flex items-center gap-2">
        <Tabs value={filter} onValueChange={(v) => onFilterChange(v as 'all' | 'unread')}>
          <TabsList className="bg-[#0f0f0f]/60 border-amber-600/20">
            <TabsTrigger value="all" className="text-xs text-amber-300 data-[state=active]:text-amber-200">
              All
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-xs text-amber-300 data-[state=active]:text-amber-200">
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllAsRead}
            className="ml-auto text-xs text-amber-600/70 hover:text-amber-400"
          >
            <CheckCheck className="w-3 h-3 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-amber-600/10">
          {notifications.map((notification) => {
            const isUnread = !notification.read;

            return (
              <div
                key={notification.id}
                className={cn(
                  'p-4 hover:bg-[#0f0f0f]/40 transition-colors cursor-pointer group',
                  isUnread && 'bg-amber-500/5'
                )}
                onClick={() => {
                  if (isUnread) {
                    onMarkAsRead(notification.id);
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                    isUnread ? 'bg-amber-500/20' : 'bg-slate-700/30'
                  )}>
                    {renderIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-sm font-medium truncate',
                          isUnread ? 'text-amber-200' : 'text-amber-300/70'
                        )}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-amber-600/70 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                      </div>
                      {isUnread && (
                        <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 mt-1" />
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        variant="outline"
                        className="bg-amber-500/5 text-amber-300/70 border-amber-600/20 text-[10px] flex items-center gap-1"
                      >
                        {renderChannelIcon(notification.channel)}
                        <span className="capitalize">{notification.channel.replace('_', ' ')}</span>
                      </Badge>
                      <span className="text-[10px] text-amber-600/50">
                        {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                      </span>
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkAsRead(notification.id);
                          }}
                          className="ml-auto h-6 px-2 text-[10px] text-amber-600/70 hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

