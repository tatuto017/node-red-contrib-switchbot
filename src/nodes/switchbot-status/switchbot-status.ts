import { Node, NodeAPI, NodeDef } from '@node-red/registry';
import { SwitchBot } from '../../switchbot/switchbot';
import { fetchHttpClient } from '../../switchbot/fetchHttpClient';
import { SwitchBotConfigNode } from '../switchbot-config/switchbot-config';

/** ステータス取得対象のデバイスタイプ（編集画面のプルダウン選択肢） */
export const SUPPORTED_DEVICE_TYPES = [
  'Plug Mini (JP)',
  'Bot',
  'Ceiling Light',
  'Humidifier2',
  'Air Purifier Table VOC',
  'Meter',
] as const;

export type SupportedDeviceType = (typeof SUPPORTED_DEVICE_TYPES)[number];

/**
 * switchbot-status ノードのプロパティ定義
 */
export interface SwitchBotStatusNodeDef extends NodeDef {
  /** 参照する設定ノードのID */
  config: string;
  /** 対象デバイスタイプ */
  deviceType: SupportedDeviceType;
  /** 対象デバイスID */
  deviceId: string;
}

/**
 * switchbot-status ノードのインスタンス型
 */
export interface SwitchBotStatusNode extends Node {
  config: string;
  deviceType: SupportedDeviceType;
  deviceId: string;
}

/**
 * switchbot-status ノードの登録
 *
 * 指定されたデバイスのステータスを SwitchBot API から取得し、
 * msg.payload に結果を格納して出力する。
 *
 * @param RED - Node-RED の NodeAPI
 */
const switchBotStatus = (RED: NodeAPI): void => {
  RED.nodes.registerType('switchbot-status', function (this: SwitchBotStatusNode, config: SwitchBotStatusNodeDef) {
    RED.nodes.createNode(this, config);

    // ノードプロパティをインスタンスに設定する
    this.config = config.config;
    this.deviceType = config.deviceType;
    this.deviceId = config.deviceId;

    // 設定ノードから認証情報を取得する
    const configNode = RED.nodes.getNode(this.config) as SwitchBotConfigNode;

    const switchBot = new SwitchBot(
      { token: configNode.token, secret: configNode.secret },
      fetchHttpClient
    );

    // インジェクトされたときにステータスを取得する
    this.on('input', async (msg, send, done) => {
      try {
        const status = await switchBot.getDeviceStatus(this.deviceId);
        msg.payload = status.body;
        send(msg);
        done();
      } catch (err) {
        done(err as Error);
      }
    });
  });
};

export default switchBotStatus;
