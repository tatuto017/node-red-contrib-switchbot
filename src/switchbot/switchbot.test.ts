import * as crypto from 'crypto';
import { SwitchBot } from './switchbot';
import { CommandRequest, DeviceListResponse, DeviceStatusResponse, CommandResponse, HttpClient } from './types';

/** テスト用の認証情報 */
const mockConfig = {
  token: 'test-token',
  secret: 'test-secret',
};

/**
 * テスト用HttpClientを生成する
 * @param overrides - 上書きするメソッド
 */
const makeHttpClient = (overrides: Partial<HttpClient> = {}): HttpClient => ({
  get: jest.fn(),
  post: jest.fn(),
  ...overrides,
});

describe('SwitchBot', () => {
  describe('buildHeaders', () => {
    it('正しい認証ヘッダーを生成する', async () => {
      // getDevices経由でヘッダーをキャプチャする
      const capturedHeaders: Record<string, string>[] = [];
      const httpClient = makeHttpClient({
        get: jest.fn().mockImplementation((_url, headers) => {
          capturedHeaders.push(headers);
          return Promise.resolve({ statusCode: 100, message: 'success', body: { deviceList: [], infraredRemoteList: [] } });
        }),
      });
      const switchBot = new SwitchBot(mockConfig, httpClient);

      await switchBot.getDevices();

      // 各ヘッダー項目が正しく設定されていることを確認
      const headers = capturedHeaders[0];
      expect(headers.Authorization).toBe(mockConfig.token);
      expect(headers.t).toBeTruthy();
      expect(headers.nonce).toBeTruthy();
      expect(headers.sign).toBeTruthy();
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('signがHMAC-SHA256で正しく計算される', async () => {
      // getDevices経由でヘッダーをキャプチャする
      let capturedHeaders: Record<string, string> = {};
      const httpClient = makeHttpClient({
        get: jest.fn().mockImplementation((_url, headers) => {
          capturedHeaders = headers;
          return Promise.resolve({ statusCode: 100, message: 'success', body: { deviceList: [], infraredRemoteList: [] } });
        }),
      });
      const switchBot = new SwitchBot(mockConfig, httpClient);

      await switchBot.getDevices();

      // キャプチャしたタイムスタンプとnonceを使って期待値を計算
      const expectedSign = crypto
        .createHmac('sha256', mockConfig.secret)
        .update(mockConfig.token + capturedHeaders.t + capturedHeaders.nonce)
        .digest('base64');
      expect(capturedHeaders.sign).toBe(expectedSign);
    });
  });

  describe('getDevices', () => {
    it('デバイス一覧を取得する', async () => {
      const mockResponse: DeviceListResponse = {
        statusCode: 100,
        message: 'success',
        body: {
          deviceList: [
            {
              deviceId: 'device-1',
              deviceName: 'Plug Mini',
              deviceType: 'Plug Mini (JP)',
              enableCloudService: true,
              hubDeviceId: 'hub-1',
            },
          ],
          infraredRemoteList: [],
        },
      };
      const httpClient = makeHttpClient({
        get: jest.fn().mockResolvedValue(mockResponse),
      });
      const switchBot = new SwitchBot(mockConfig, httpClient);

      const result = await switchBot.getDevices();

      // レスポンスの内容と呼び出しURLが正しいことを確認
      expect(result).toEqual(mockResponse);
      expect(httpClient.get).toHaveBeenCalledWith(
        'https://api.switch-bot.com/v1.1/devices',
        expect.any(Object)
      );
    });
  });

  describe('getDeviceStatus', () => {
    it('デバイスの状態を取得する', async () => {
      const mockResponse: DeviceStatusResponse = {
        statusCode: 100,
        message: 'success',
        body: {
          deviceId: 'device-1',
          deviceType: 'Plug Mini (JP)',
          hubDeviceId: 'hub-1',
          version: 'V2.7-2.7',
          power: 'on',
          voltage: 102.6,
          weight: 128.4,
          electricityOfDay: 301,
          electricCurrent: 1666,
        },
      };
      const httpClient = makeHttpClient({
        get: jest.fn().mockResolvedValue(mockResponse),
      });
      const switchBot = new SwitchBot(mockConfig, httpClient);

      const result = await switchBot.getDeviceStatus('device-1');

      // レスポンスの内容とデバイスIDを含むURLが正しいことを確認
      expect(result).toEqual(mockResponse);
      expect(httpClient.get).toHaveBeenCalledWith(
        'https://api.switch-bot.com/v1.1/devices/device-1/status',
        expect.any(Object)
      );
    });
  });

  describe('sendCommand', () => {
    it('デバイスにコマンドを送信する', async () => {
      const mockResponse: CommandResponse = {
        statusCode: 100,
        message: 'success',
        body: {},
      };
      const httpClient = makeHttpClient({
        post: jest.fn().mockResolvedValue(mockResponse),
      });
      const switchBot = new SwitchBot(mockConfig, httpClient);
      const command: CommandRequest = { command: 'turnOn' };

      const result = await switchBot.sendCommand('device-1', command);

      // レスポンスの内容・URL・コマンドボディが正しいことを確認
      expect(result).toEqual(mockResponse);
      expect(httpClient.post).toHaveBeenCalledWith(
        'https://api.switch-bot.com/v1.1/devices/device-1/commands',
        expect.any(Object),
        command
      );
    });

    it('パラメータ付きコマンドを送信する', async () => {
      const mockResponse: CommandResponse = {
        statusCode: 100,
        message: 'success',
        body: {},
      };
      const httpClient = makeHttpClient({
        post: jest.fn().mockResolvedValue(mockResponse),
      });
      const switchBot = new SwitchBot(mockConfig, httpClient);
      // パラメータを含むコマンド（色温度の設定）
      const command: CommandRequest = { command: 'setColorTemperature', parameter: '4000' };

      const result = await switchBot.sendCommand('device-1', command);

      // パラメータを含むコマンドボディがそのまま渡されることを確認
      expect(result).toEqual(mockResponse);
      expect(httpClient.post).toHaveBeenCalledWith(
        'https://api.switch-bot.com/v1.1/devices/device-1/commands',
        expect.any(Object),
        command
      );
    });
  });

});
