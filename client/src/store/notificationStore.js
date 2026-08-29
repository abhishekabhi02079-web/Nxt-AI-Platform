import { create } from 'zustand';
import api from '../services/api';
import { subscribeToNotifications, getSocket } from '../services/socket';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isDrawerOpen: false,
  isLoading: false,
  error: null,

  // Toggle or set drawer state
  toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),
  setDrawerOpen: (open) => set({ isDrawerOpen: Boolean(open) }),

  // Fetch initial notifications and unread count
  fetchNotifications: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get('/notifications', { params });
      const { notifications, unreadCount } = res.data.data;
      set({
        notifications: notifications || [],
        unreadCount: unreadCount || 0,
        isLoading: false,
      });
      return notifications;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to fetch notifications';
      set({ isLoading: false, error: message });
      return [];
    }
  },

  // Mark single notification as read
  markAsRead: async (notificationId) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n._id === notificationId ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    try {
      await api.post('/notifications/read-all');
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  },

  // Delete notification
  deleteNotification: async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      set((state) => {
        const target = state.notifications.find((n) => n._id === notificationId);
        const wasUnread = target && !target.isRead;
        return {
          notifications: state.notifications.filter((n) => n._id !== notificationId),
          unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
        };
      });
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  },

  // Initialize real-time Socket.IO notification listener
  initNotificationSocket: () => {
    const unsubscribe = subscribeToNotifications({
      onNew: (newNotification) => {
        set((state) => {
          // Deduplicate
          const exists = state.notifications.some((n) => n._id === newNotification._id);
          if (exists) return state;

          return {
            notifications: [newNotification, ...state.notifications],
            unreadCount: state.unreadCount + (newNotification.isRead ? 0 : 1),
          };
        });
      },

      onRead: ({ notificationId }) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n._id === notificationId ? { ...n, isRead: true } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        }));
      },

      onReadAll: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
          unreadCount: 0,
        }));
      },
    });

    return unsubscribe;
  },
}));

export default useNotificationStore;
