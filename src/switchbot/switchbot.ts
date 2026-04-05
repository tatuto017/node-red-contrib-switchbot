import * as crypto from 'crypto';
import {
  CommandRequest,
  CommandResponse,
  DeviceListResponse,
  DeviceStatusResponse,
  HttpClient,
  SwitchBotConfig,
} from './types';

/** SwitchBot API のベースURL */
const BASE_URL = 'https://api.switch-bot.com/v1.1';

/**
 * SwitchBot API クライアント
 *
 * SwitchBot APIとの通信を担うクラス。
 * 認証ヘッダーの生成、デバイス一覧の取得、デバイス状態の取得、デバイス操作を提供する。
 */
export class SwitchBot {
  private readonly token: string;
  private readonly secret: string;
  private readonly httpClient: HttpClient;

  /**
   * @param config - SwitchBot APIの認証情報（トークン・シークレット）
   * @param httpClient - HTTPリクエストを行うクライアント
   */
  constructor(config: SwitchBotConfig, httpClient: HttpClient) {
    this.token = config.token;
    this.secret = config.secret;
    this.httpClient = httpClient;
  }

  /**
   * SwitchBot API の認証ヘッダーを生成する
   *
   * タイムスタンプとUUIDをnonceとして使用し、HMAC-SHA256でsignを計算する。
   * @returns 認証情報を含むHTTPヘッダー
   */
  private buildHeaders = (): Record<string, string> => {
    const timestamp = Date.now().toString();
    const nonce = crypto.randomUUID();
    // トークン・タイムスタンプ・nonceを結合してHMAC-SHA256で署名
    const sign = crypto
      .createHmac('sha256', this.secret)
      .update(this.token + timestamp + nonce)
      .digest('base64');

    return {
      Authorization: this.token,
      t: timestamp,
      nonce,
      sign,
      'Content-Type': 'application/json',
    };
  };

  /**
   * デバイス一覧を取得する
   *
   * @returns デバイス一覧レスポンス（deviceList と infraredRemoteList を含む）
   */
  getDevices = async (): Promise<DeviceListResponse> => {
    const url = `${BASE_URL}/devices`;
    const response = await this.httpClient.get(url, this.buildHeaders());
    return response as DeviceListResponse;
  };

  /**
   * 指定したデバイスの状態を取得する
   *
   * @param deviceId - 状態を取得するデバイスのID
   * @returns デバイス状態レスポンス
   */
  getDeviceStatus = async (deviceId: string): Promise<DeviceStatusResponse> => {
    const url = `${BASE_URL}/devices/${deviceId}/status`;
    const response = await this.httpClient.get(url, this.buildHeaders());
    return response as DeviceStatusResponse;
  };

  /**
   * 指定したデバイスにコマンドを送信する
   *
   * @param deviceId - 操作対象のデバイスID
   * @param command - 送信するコマンド（コマンド名・パラメータ等を含む）
   * @returns コマンド実行レスポンス
   */
  sendCommand = async (deviceId: string, command: CommandRequest): Promise<CommandResponse> => {
    const url = `${BASE_URL}/devices/${deviceId}/commands`;
    const response = await this.httpClient.post(url, this.buildHeaders(), command);
    return response as CommandResponse;
  };

}
