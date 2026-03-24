// lib/notificationApi.ts  — SELLER DASHBOARD (choosetounsi-frontend) version
// Uses the same axios instance that already handles the token via interceptor.
// Copy this to your choosetounsi-frontend project: lib/notificationApi.ts

import api from './sellerApi'   // ← your existing seller axios instance
// If the import path is different, change 'sellerApi' to whatever your
// seller dashboard axios file is called (the one with ct_auth_token)

export interface AppNotification {
  id: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  data: {
    type: string;
    action: string;
    title: string;
    body: string;
    icon: string;
    link: string;
    [key: string]: unknown;
  };
}

export interface NotificationListResponse {
  data: AppNotification[];
  meta: {
    current_page: number;
    last_page: number;
    total: number;
  };
}

// Seller notification API — routes under /notifications
export const sellerNotificationApi = {
  async getAll(page = 1): Promise<NotificationListResponse> {
    const res = await api.get('/notifications', {
      params: { page, per_page: 20 },
    });
    return { data: res.data.data, meta: res.data.meta };
  },

  async getUnreadCount(): Promise<number> {
    const res = await api.get('/notifications/unread-count');
    return res.data.count as number;
  },

  async markRead(id: string): Promise<void> {
    await api.patch(`/notifications/${id}/read`);
  },

  async markAllRead(): Promise<void> {
    await api.patch('/notifications/read-all');
  },
};