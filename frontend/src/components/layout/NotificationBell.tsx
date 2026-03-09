import { useState, useEffect, useRef } from 'react';
import { Bell, BookOpen, ClipboardList, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '@/store/notification.store';
import notificationService from '@/services/notification.service';

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const TYPE_ICONS: Record<string, typeof Bell> = {
  new_exam: ClipboardList,
  new_material: BookOpen,
  exam_submitted: FileText,
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(dateStr).toLocaleDateString('vi-VN');
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const { unreadCount, setUnreadCount } = useNotificationStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Fetch unread count on mount + poll every 15s
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await notificationService.getUnreadCount();
        setUnreadCount(res.data.data?.total || 0);
      } catch { /* silent */ }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 15000);
    return () => clearInterval(interval);
  }, [setUnreadCount]);

  // Load notification list when dropdown opens + poll every 5s while open
  useEffect(() => {
    if (!open) return;
    const fetchList = async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const res = await notificationService.getNotifications(0, 20);
        setNotifications(res.data.data || []);
      } catch {
        if (showLoading) setNotifications([]);
      } finally {
        if (showLoading) setLoading(false);
      }
    };
    fetchList(true);
    const interval = setInterval(() => fetchList(false), 5000);
    return () => clearInterval(interval);
  }, [open]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleClick = async (noti: Notification) => {
    // Mark as read
    if (!noti.is_read) {
      try {
        await notificationService.markAsRead(noti.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === noti.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount(Math.max(0, unreadCount - 1));
      } catch { /* silent */ }
    }
    setOpen(false);
    if (noti.link) navigate(noti.link);
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
        title="Thông báo"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Thông báo</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-primary hover:underline"
              >
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">
                Chưa có thông báo nào
              </div>
            ) : (
              notifications.map((noti) => {
                const Icon = TYPE_ICONS[noti.type] || Bell;
                return (
                  <button
                    key={noti.id}
                    onClick={() => handleClick(noti)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                      !noti.is_read ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div
                      className={`mt-0.5 p-2 rounded-xl flex-shrink-0 ${
                        !noti.is_read
                          ? 'bg-primary/10 text-primary'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm leading-snug ${
                          !noti.is_read ? 'font-medium text-gray-800' : 'text-gray-600'
                        }`}
                      >
                        {noti.content}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {timeAgo(noti.created_at)}
                      </p>
                    </div>
                    {!noti.is_read && (
                      <span className="mt-2 w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
