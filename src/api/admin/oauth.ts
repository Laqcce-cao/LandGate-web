import client from '../client';

export interface OAuthAuthorizeRequest {
  platform: string;
  redirectUri?: string;
}

export interface OAuthAuthorizeResponse {
  authorizeUrl: string;
  state: string;
  expiresIn: number;
}

export interface OAuthCallbackRequest {
  code: string;
  state: string;
}

export interface OAuthCallbackResponse {
  accountId: number;
  name: string;
  platform: string;
  type: string;
  status: string;
  expiresAt: string;
}

// ---- Device Code Flow (OpenAI) ----

export interface DeviceCodeRequest {
  platform: string;
}

export interface DeviceCodeResponse {
  deviceAuthId: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
}

export interface DeviceCodePollRequest {
  deviceAuthId: string;
  userCode: string;
}

export type DeviceCodePollStatus = 'PENDING' | 'EXPIRED' | 'SUCCESS';

export interface DeviceCodePollResponse {
  status: DeviceCodePollStatus;
  account: OAuthCallbackResponse | null;
}

export const oauthApi = {
  // Authorization Code Flow (Anthropic)
  authorize: (data: OAuthAuthorizeRequest) =>
    client.post<OAuthAuthorizeResponse>('/admin/oauth/authorize', data),

  callback: (data: OAuthCallbackRequest) =>
    client.post<OAuthCallbackResponse>('/admin/oauth/callback', data),

  // Device Code Flow (OpenAI)
  initiateDeviceCode: (data: DeviceCodeRequest) =>
    client.post<DeviceCodeResponse>('/admin/oauth/device-code', data),

  pollDeviceCode: (data: DeviceCodePollRequest) =>
    client.post<DeviceCodePollResponse>('/admin/oauth/device-code/poll', data),

  // Token refresh
  refreshToken: (accountId: number) =>
    client.post(`/admin/oauth/accounts/${accountId}/refresh`),
};
