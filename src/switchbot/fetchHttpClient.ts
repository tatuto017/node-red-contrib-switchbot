import { HttpClient } from './types';

export const fetchHttpClient: HttpClient = {
  get: async (url: string, headers: Record<string, string>): Promise<unknown> => {
    const response = await fetch(url, { method: 'GET', headers });
    return response.json();
  },
  post: async (url: string, headers: Record<string, string>, body: unknown): Promise<unknown> => {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    return response.json();
  },
};
