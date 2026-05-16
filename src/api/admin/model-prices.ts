import client from '../client';

export interface ModelPrice {
  id: number;
  model: string;
  platform: string;
  inputPrice?: number;
  outputPrice?: number;
  cacheWritePrice?: number;
  cacheReadPrice?: number;
  groupId?: number | null;
  enabled?: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ModelPriceListResponse {
  prices: ModelPrice[];
  total: number;
}

export const modelPricesApi = {
  list: (page = 0, size = 50) =>
    client.get<ModelPriceListResponse>('/admin/model-prices', { params: { page, size } }),
  getById: (id: number) =>
    client.get<ModelPrice>(`/admin/model-prices/${id}`),
  create: (data: Partial<ModelPrice>) =>
    client.post<ModelPrice>('/admin/model-prices', data),
  update: (id: number, data: Partial<ModelPrice>) =>
    client.put<ModelPrice>(`/admin/model-prices/${id}`, data),
  delete: (id: number) =>
    client.delete(`/admin/model-prices/${id}`),
  byPlatform: (platform: string) =>
    client.get<ModelPriceListResponse>(`/admin/model-prices/platform/${platform}`),
};
