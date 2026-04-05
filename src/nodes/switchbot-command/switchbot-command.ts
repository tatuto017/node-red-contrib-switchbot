import { Node, NodeAPI, NodeDef } from '@node-red/registry';
import { SwitchBot } from '../../switchbot/switchbot';
import { fetchHttpClient } from '../../switchbot/fetchHttpClient';
import { CommandRequest } from '../../switchbot/types';
import { SwitchBotConfigNode } from '../switchbot-config/switchbot-config';

/** コマンド送信対象のデバイスタイプ */
export const SUPPORTED_DEVICE_TYPES = [
  'Plug Mini (JP)',
  'Bot',
  'Ceiling Light',
  'Humidifier2',
  'Air Purifier Table VOC',
  'Air Conditioner',
] as const;

export type SupportedDeviceType = (typeof SUPPORTED_DEVICE_TYPES)[number];

/**
 * switchbot-command ノードのプロパティ定義
 */
export interface SwitchBotCommandNodeDef extends NodeDef {
  /** 参照する設定ノードのID */
  config: string;
  /** 対象デバイスタイプ */
  deviceType: SupportedDeviceType;
  /** 対象デバイスID */
  deviceId: string;
  /** 送信するコマンド名 */
  command: string;
  /** コマンドパラメータ（省略可） */
  parameter?: string;
}

/**
 * switchbot-command ノードのインスタンス型
 */
export interface SwitchBotCommandNode extends Node {
  config: string;
  deviceType: SupportedDeviceType;
  deviceId: string;
  command: string;
  parameter?: string;
}

/**
 * ノードプロパティからコマンドリクエストを生成する
 *
 * commandType は "command" 固定。parameter が空文字・未定義の場合はキーを含めない。
 *
 * @param command - コマンド名
 * @param parameter - コマンドパラメータ（省略可）
 * @returns CommandRequest オブジェクト
 */
export const buildCommandRequest = (command: string, parameter?: string): CommandRequest => {
  const req: CommandRequest = {
    commandType: 'command',
    command,
  };
  if (parameter !== undefined && parameter !== '') {
    req.parameter = parameter;
  }
  return req;
};

/**
 * switchbot-command ノードの登録
 *
 * 指定されたデバイスにコマンドを送信し、結果を msg.payload に格納して出力する。
 *
 * @param RED - Node-RED の NodeAPI
 */
const switchBotCommand = (RED: NodeAPI): void => {
  RED.nodes.registerType('switchbot-command', function (this: SwitchBotCommandNode, config: SwitchBotCommandNodeDef) {
    RED.nodes.createNode(this, config);

    // ノードプロパティをインスタンスに設定する
    this.config = config.config;
    this.deviceType = config.deviceType;
    this.deviceId = config.deviceId;
    this.command = config.command;
    this.parameter = config.parameter;

    // 設定ノードから認証情報を取得する
    const configNode = RED.nodes.getNode(this.config) as SwitchBotConfigNode;

    const switchBot = new SwitchBot(
      { token: configNode.token, secret: configNode.secret },
      fetchHttpClient
    );

    // インジェクトされたときにコマンドを送信する
    this.on('input', async (msg, send, done) => {
      try {
        const commandRequest = buildCommandRequest(this.command, this.parameter);
        const result = await switchBot.sendCommand(this.deviceId, commandRequest);
        msg.payload = result.body;
        // 送信したコマンドを msg.command にセットする
        msg.command = commandRequest;
        send(msg);
        done();
      } catch (err) {
        done(err as Error);
      }
    });
  });
};

export default switchBotCommand;
