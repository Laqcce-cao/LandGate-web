import client from '../client';

export interface Group {
  id: number;
  name: string;
  description?: string;
  rateMultiplier?: number;
  isExclusive?: boolean;
  status: string;
  subscriptionType?: string;
  dailyLimitUsd?: number;
  weeklyLimitUsd?: number;
  monthlyLimitUsd?: number;
  defaultValidityDays?: number;
  allowImageGeneration?: boolean;
  imageRateMultiplier?: number;
  claudeCodeOnly?: boolean;
  fallbackGroupId?: number;
  fallbackGroupIdOnInvalidRequest?: number;
  modelRouting?: string;
  modelRoutingEnabled?: boolean;
  mcpXmlInject?: string;
  sortOrder?: number;
  allowMessagesDispatch?: boolean;
  requireOauthOnly?: boolean;
  requirePrivacySet?: boolean;
  defaultMappedModel?: string;
  messagesDispatchModelConfig?: string;
  rpmLimit?: number;
  excludedModels?: string;
  provider?: string;
  supportedProtocols?: string;
  protocolStrategy?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
}

export interface AccountGroup {
  accountId: number;
  groupId: number;
  priority: number;
  createdAt?: string;
}

export interface UserAllowedGroup {
  userId: number;
  groupId: number;
  createdAt?: string;
}

export interface GroupListResponse {
  groups: Group[];
  total: number;
}

export interface AccountGroupListResponse {
  accounts: AccountGroup[];
  total: number;
}

export interface UserAllowedGroupListResponse {
  users: UserAllowedGroup[];
  total: number;
}

export const groupsApi = {
  list: () => client.get<GroupListResponse>('/admin/groups'),
  getById: (id: number) => client.get<Group>(`/admin/groups/${id}`),
  getSupportedModels: (id: number) => client.get<{ supportedModels: string }>(`/admin/groups/${id}/supported-models`),
  create: (data: Partial<Group>) => client.post<Group>('/admin/groups', data),
  update: (id: number, data: Partial<Group>) => client.put<Group>(`/admin/groups/${id}`, data),
  delete: (id: number) => client.delete(`/admin/groups/${id}`),
  listAccounts: (groupId: number) =>
    client.get<AccountGroupListResponse>(`/admin/groups/${groupId}/accounts`),
  bindAccount: (groupId: number, accountId: number, priority: number) =>
    client.post(`/admin/groups/${groupId}/accounts`, { accountId, priority }),
  updatePriority: (groupId: number, accountId: number, priority: number) =>
    client.put(`/admin/groups/${groupId}/accounts/${accountId}/priority`, { priority }),
  unbindAccount: (groupId: number, accountId: number) =>
    client.delete(`/admin/groups/${groupId}/accounts/${accountId}`),
  listUsers: (groupId: number) =>
    client.get<UserAllowedGroupListResponse>(`/admin/groups/${groupId}/users`),
  allowUser: (groupId: number, userId: number) =>
    client.post(`/admin/groups/${groupId}/users`, { userId }),
  revokeUser: (groupId: number, userId: number) =>
    client.delete(`/admin/groups/${groupId}/users/${userId}`),
};
