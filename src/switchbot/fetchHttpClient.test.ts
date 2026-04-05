import { fetchHttpClient } from './fetchHttpClient';

/** fetch のレスポンスモックを生成する */
const makeFetchResponse = (data: unknown) => ({
  json: jest.fn().mockResolvedValue(data),
});

describe('fetchHttpClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('指定した URL と headers で GET リクエストを送信し、レスポンスの JSON を返す', async () => {
      const mockResponse = makeFetchResponse({ statusCode: 100 });
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      const result = await fetchHttpClient.get('https://example.com/api', { Authorization: 'token' });

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith('https://example.com/api', {
        method: 'GET',
        headers: { Authorization: 'token' },
      });
      expect(result).toEqual({ statusCode: 100 });
    });
  });

  describe('post', () => {
    it('指定した URL・headers・body で POST リクエストを送信し、レスポンスの JSON を返す', async () => {
      const mockResponse = makeFetchResponse({ statusCode: 100 });
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      const body = { command: 'turnOn', commandType: 'command' };
      const result = await fetchHttpClient.post('https://example.com/api', { Authorization: 'token' }, body);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith('https://example.com/api', {
        method: 'POST',
        headers: { Authorization: 'token' },
        body: JSON.stringify(body),
      });
      expect(result).toEqual({ statusCode: 100 });
    });
  });
});
