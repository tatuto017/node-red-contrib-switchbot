import * as path from 'path';
import { Node, NodeAPI, NodeDef } from '@node-red/registry';
import { SwitchBot } from '../../switchbot/switchbot';
import { fetchHttpClient } from '../../switchbot/fetchHttpClient';

/**
 * switchbot-config ノードのプロパティ定義
 */
export interface SwitchBotConfigNodeDef extends NodeDef {
  token: string;
  secret: string;
}

/**
 * switchbot-config ノードのインスタンス型
 * 他のノードから参照するための設定ノード
 */
export interface SwitchBotConfigNode extends Node {
  token: string;
  secret: string;
}

/**
 * switchbot-config ノードの登録
 *
 * SwitchBot APIの認証情報（token / secret）を保持する設定ノード。
 * 複数のノードから共通の接続設定を参照するために使用する。
 * また、編集画面用のデバイス一覧取得APIエンドポイントを登録する。
 *
 * @param RED - Node-RED の NodeAPI
 */
const switchBotConfig = (RED: NodeAPI): void => {
  // 編集画面用UIスクリプトを配信するエンドポイントを登録する
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (RED as any).httpAdmin.get('/switchbot/command-ui.js', (_req: any, res: any) => {
    res.sendFile(path.join(__dirname, '..', 'switchbot-command', 'switchbot-command-ui.js'));
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (RED as any).httpAdmin.get('/switchbot/status-ui.js', (_req: any, res: any) => {
    res.sendFile(path.join(__dirname, '..', 'switchbot-status', 'switchbot-status-ui.js'));
  });

  // 編集画面からデバイス一覧を取得するための Admin API エンドポイントを登録する
  // switchbot-status・switchbot-command の両ノードから共用する
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (RED as any).httpAdmin.get('/switchbot/device-types', async (req: any, res: any) => {
    const configId = req.query.configId as string;

    // 指定された設定ノードを取得する
    const configNode = RED.nodes.getNode(configId) as SwitchBotConfigNode;
    if (!configNode || !configNode.token) {
      res.status(404).json({ error: 'Config node not found' });
      return;
    }

    const switchBot = new SwitchBot(
      { token: configNode.token, secret: configNode.secret },
      fetchHttpClient
    );

    try {
      const result = await switchBot.getDevices();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const deviceList: any[] = (result.body as any).deviceList || [];
      // deviceList から一意のデバイスタイプを抽出して返す
      const deviceTypes = [...new Set<string>(deviceList.map((d) => d.deviceType as string))];
      res.json(deviceTypes);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (RED as any).httpAdmin.get('/switchbot/devices', async (req: any, res: any) => {
    const configId = req.query.configId as string;
    const includeInfrared = req.query.includeInfrared === 'true';

    // 指定された設定ノードを取得する
    const configNode = RED.nodes.getNode(configId) as SwitchBotConfigNode;
    if (!configNode || !configNode.token) {
      res.status(404).json({ error: 'Config node not found' });
      return;
    }

    const switchBot = new SwitchBot(
      { token: configNode.token, secret: configNode.secret },
      fetchHttpClient
    );

    try {
      const result = await switchBot.getDevices();
      // infraredRemoteList を含めるかどうかをクエリパラメータで制御する
      if (!includeInfrared) {
        const { infraredRemoteList: _, ...body } = result.body as any;
        res.json(body);
      } else {
        res.json(result.body);
      }
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  RED.nodes.registerType('switchbot-config', function (this: SwitchBotConfigNode, config: SwitchBotConfigNodeDef) {
    RED.nodes.createNode(this, config);
    // 認証情報をノードインスタンスに保持する
    this.token = config.token;
    this.secret = config.secret;
  });
};

export default switchBotConfig;
