import { SwitchBot } from '../switchbot/switchbot';
import { fetchHttpClient } from '../switchbot/fetchHttpClient';

/**
 * デバイス一覧を取得し、デバイスタイプをコンソールに出力するスクリプト
 *
 * 実行前に以下の環境変数を設定してください:
 *   SWITCHBOT_TOKEN  - SwitchBot API トークン
 *   SWITCHBOT_SECRET - SwitchBot API シークレット
 */
const main = async (): Promise<void> => {
  const token = process.env.SWITCHBOT_TOKEN;
  const secret = process.env.SWITCHBOT_SECRET;

  // 環境変数が未設定の場合はエラーを出力して終了する
  if (!token || !secret) {
    console.error('エラー: 環境変数 SWITCHBOT_TOKEN と SWITCHBOT_SECRET を設定してください');
    process.exit(1);
  }

  const switchBot = new SwitchBot({ token, secret }, fetchHttpClient);

  // デバイス一覧を取得する
  const response = await switchBot.getDevices();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deviceList: any[] = (response.body as any).deviceList || [];

  // デバイス一覧からデバイスタイプを抽出して重複を除く
  const deviceTypes = [...new Set<string>(deviceList.map((d) => d.deviceType as string))];

  console.log('デバイスタイプ一覧:');
  deviceTypes.forEach((type) => {
    console.log(' -', type);
  });
};

main().catch((err) => {
  console.error('エラー:', err);
  process.exit(1);
});
