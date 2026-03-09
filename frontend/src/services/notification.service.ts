import api from './api';

const notificationService = {
  getNotifications: (skip = 0, limit = 30) =>
    api.get('/notifications', { params: { skip, limit } }),

  getUnreadCount: () =>
    api.get('/notifications/unread-count'),

  markAsRead: (id: string) =>
    api.put(`/notifications/${id}/read`),

  markAllAsRead: () =>
    api.put('/notifications/read-all'),
};

export default notificationService;
