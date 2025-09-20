import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import './NotificationBell.scss';

// 型定義（コンポーネント内で直接定義）
interface Notification {
  id: string;
  workspace_id: string;
  user_id: string;
  actor_user_id: string;
  type: 'idea_created' | 'idea_moved' | 'proposal_added' | 'member_joined';
  message: string;
  related_id?: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationWithProfile extends Notification {
  actor_profile: {
    username: string;
  };
}

interface NotificationBellProps {
  workspaceId: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ workspaceId }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationWithProfile[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // 通知データを取得
    const fetchNotifications = async () => {
    if (!user) return;

    try {
        setLoading(true);
        
        // 1. 通知データを取得
        const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

        if (notificationsError) throw notificationsError;

        // 2. 各通知のactor_user_idからプロフィール情報を取得
        const notificationsWithProfile = await Promise.all(
        notificationsData.map(async (notification) => {
            const { data: profileData } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', notification.actor_user_id)
            .single();

            return {
            ...notification,
            actor_profile: profileData || { username: '不明なユーザー' }
            };
        })
        );

        setNotifications(notificationsWithProfile);
        setUnreadCount(notificationsData.filter(n => !n.is_read).length);
    } catch (error) {
        console.error('通知取得エラー:', error);
    } finally {
        setLoading(false);
    }
    };

  // 通知を既読にする
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('既読更新エラー:', error);
    }
  };

  // 全ての通知を既読にする
  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('全既読更新エラー:', error);
    }
  };

  // リアルタイム通知の監視
  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    const channel = supabase
      .channel(`notifications:${workspaceId}:${user.id}`)
      .on(
        'postgres_changes',
        {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `workspace_id=eq.${workspaceId} AND user_id=eq.${user.id}`
        },
        () => {
            fetchNotifications(); // 新しい通知があった場合は再取得
        }
        )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, user]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return 'たった今';
    if (diffMinutes < 60) return `${diffMinutes}分前`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}時間前`;
    return `${Math.floor(diffMinutes / 1440)}日前`;
  };

  return (
    <div className="notification-bell">
        <button 
        className="notification-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="通知"
        >
        {unreadCount > 0 ? (
            <span className="notification-badge-with-count">{unreadCount}</span>
        ) : (
            <span className="notification-dot"></span>
        )}
        </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>通知</h3>
            {unreadCount > 0 && (
              <button 
                className="mark-all-read"
                onClick={markAllAsRead}
              >
                すべて既読
              </button>
            )}
          </div>

          <div className="notification-list">
            {loading ? (
              <div className="notification-loading">読み込み中...</div>
            ) : notifications.length === 0 ? (
              <div className="no-notifications">通知はありません</div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                  onClick={() => {
                    if (!notification.is_read) {
                      markAsRead(notification.id);
                    }
                  }}
                >
                  <div className="notification-message">
                    {notification.message}
                  </div>
                  <div className="notification-time">
                    {formatTime(notification.created_at)}
                  </div>
                  {!notification.is_read && (
                    <div className="unread-indicator"></div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};