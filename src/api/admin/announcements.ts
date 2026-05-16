import client from '../client';

export interface Announcement {
  id: number;
  title: string;
  content?: string;
  type: string;
  published: boolean;
  publishAt?: string;
  expiresAt?: string;
  sortOrder: number;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AnnouncementListResponse {
  announcements: Announcement[];
  total: number;
}

export const announcementsApi = {
  list: () => client.get<AnnouncementListResponse>('/admin/announcements'),
  create: (data: Partial<Announcement>) =>
    client.post<Announcement>('/admin/announcements', data),
  update: (id: number, data: Partial<Announcement>) =>
    client.put<Announcement>(`/admin/announcements/${id}`, data),
  publish: (id: number) => client.post(`/admin/announcements/${id}/publish`),
  unpublish: (id: number) => client.post(`/admin/announcements/${id}/unpublish`),
  delete: (id: number) => client.delete(`/admin/announcements/${id}`),
};
