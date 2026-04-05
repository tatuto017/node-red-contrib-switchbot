import { NodeAPI } from '@node-red/registry';
import switchBotCommand, {
  SUPPORTED_DEVICE_TYPES,
  SwitchBotCommandNode,
  SwitchBotCommandNodeDef,
  buildCommandRequest,
} from './switchbot-command';
import { SwitchBotConfigNode } from '../switchbot-config/switchbot-config';
import { SwitchBot } from '../../switchbot/switchbot';

// SwitchBotクラスをモック化する
jest.mock('../../switchbot/switchbot');
// fetchHttpClientをモック化する
jest.mock('../../switchbot/fetchHttpClient', () => ({
  fetchHttpClient: {},
}));

/** テスト用 NodeAPI モックを生成する */
const makeRED = (configNode: Partial<SwitchBotConfigNode> = {}): NodeAPI => {
  return {
    nodes: {
      registerType: jest.fn(),
      createNode: jest.fn(),
      getNode: jest.fn().mockReturnValue({
        token: 'test-token',
        secret: 'test-secret',
        ...configNode,
      }),
    },
  } as unknown as NodeAPI;
};

/** テスト用ノード設定を生成する */
const makeConfig = (overrides: Partial<SwitchBotCommandNodeDef> = {}): SwitchBotCommandNodeDef => ({
  id: 'command-node-1',
  type: 'switchbot-command',
  name: 'test command',
  z: '',
  config: 'config-node-1',
  deviceType: 'Plug Mini (JP)',
  deviceId: 'device-1',
  command: 'turnOn',
  parameter: undefined,
  ...overrides,
} as SwitchBotCommandNodeDef);

/** コンストラクタを取り出してノードインスタンスを生成する */
const createNodeInstance = (RED: NodeAPI, config: SwitchBotCommandNodeDef): SwitchBotCommandNode => {
  const Constructor = (RED.nodes.registerType as jest.Mock).mock.calls[0][1] as (
    this: SwitchBotCommandNode,
    config: SwitchBotCommandNodeDef
  ) => void;
  const nodeInstance = { on: jest.fn() } as unknown as SwitchBotCommandNode;
  Constructor.call(nodeInstance, config);
  return nodeInstance;
};

describe('switchbot-command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerType', () => {
    it('switchbot-command という名前でノードを登録する', () => {
      const RED = makeRED();

      switchBotCommand(RED);

      expect(RED.nodes.registerType).toHaveBeenCalledTimes(1);
      expect(RED.nodes.registerType).toHaveBeenCalledWith('switchbot-command', expect.any(Function));
    });
  });

  describe('SUPPORTED_DEVICE_TYPES', () => {
    it('対応デバイスタイプが正しく定義されている', () => {
      expect(SUPPORTED_DEVICE_TYPES).toContain('Plug Mini (JP)');
      expect(SUPPORTED_DEVICE_TYPES).toContain('Bot');
      expect(SUPPORTED_DEVICE_TYPES).toContain('Ceiling Light');
      expect(SUPPORTED_DEVICE_TYPES).toContain('Humidifier2');
      expect(SUPPORTED_DEVICE_TYPES).toContain('Air Purifier Table VOC');
      expect(SUPPORTED_DEVICE_TYPES).toContain('Air Conditioner');
    });

    it('Ceiling Light Pro は統合されているため含まれない', () => {
      expect(SUPPORTED_DEVICE_TYPES).not.toContain('Ceiling Light Pro');
    });
  });

  describe('buildCommandRequest', () => {
    it('パラメータなしのコマンドリクエストを生成する', () => {
      const result = buildCommandRequest('turnOn');

      expect(result).toEqual({ commandType: 'command', command: 'turnOn' });
    });

    it('パラメータありのコマンドリクエストを生成する', () => {
      const result = buildCommandRequest('setColorTemperature', '4000');

      expect(result).toEqual({ commandType: 'command', command: 'setColorTemperature', parameter: '4000' });
    });

    it('parameterが空文字の場合はキーを含めない', () => {
      const result = buildCommandRequest('turnOn', '');

      expect(result).toEqual({ commandType: 'command', command: 'turnOn' });
      expect(result).not.toHaveProperty('parameter');
    });

    it('parameterがundefinedの場合はキーを含めない', () => {
      const result = buildCommandRequest('turnOn', undefined);

      expect(result).toEqual({ commandType: 'command', command: 'turnOn' });
      expect(result).not.toHaveProperty('parameter');
    });
  });

  describe('ノードコンストラクタ', () => {
    it('ノードプロパティを正しく設定する', () => {
      const RED = makeRED();
      switchBotCommand(RED);

      const config = makeConfig({ command: 'turnOff', parameter: undefined });
      const nodeInstance = createNodeInstance(RED, config);

      expect(RED.nodes.createNode).toHaveBeenCalledTimes(1);
      expect(RED.nodes.createNode).toHaveBeenCalledWith(nodeInstance, config);
      expect(nodeInstance.config).toBe('config-node-1');
      expect(nodeInstance.deviceType).toBe('Plug Mini (JP)');
      expect(nodeInstance.deviceId).toBe('device-1');
      expect(nodeInstance.command).toBe('turnOff');
    });

    it('設定ノードから認証情報を取得してSwitchBotを初期化する', () => {
      const RED = makeRED({ token: 'my-token', secret: 'my-secret' });
      switchBotCommand(RED);

      createNodeInstance(RED, makeConfig({ config: 'config-node-1' }));

      // 設定ノードのIDで getNode が呼ばれることを確認
      expect(RED.nodes.getNode).toHaveBeenCalledTimes(1);
      expect(RED.nodes.getNode).toHaveBeenCalledWith('config-node-1');

      // 取得した認証情報でSwitchBotが初期化されることを確認
      expect(SwitchBot).toHaveBeenCalledTimes(1);
      expect(SwitchBot).toHaveBeenCalledWith(
        { token: 'my-token', secret: 'my-secret' },
        expect.any(Object)
      );
    });

    it('input イベントハンドラを登録する', () => {
      const RED = makeRED();
      switchBotCommand(RED);

      const nodeInstance = createNodeInstance(RED, makeConfig());

      expect(nodeInstance.on).toHaveBeenCalledTimes(1);
      expect(nodeInstance.on).toHaveBeenCalledWith('input', expect.any(Function));
    });
  });

  describe('input イベント', () => {
    /** inputハンドラを取り出す */
    const getInputHandler = (nodeInstance: SwitchBotCommandNode) => {
      return (nodeInstance.on as jest.Mock).mock.calls[0][1] as (
        msg: Record<string, unknown>,
        send: jest.Mock,
        done: jest.Mock
      ) => Promise<void>;
    };

    it('パラメータなしコマンドを送信してmsg.payloadにセットする', async () => {
      const mockResponseBody = { items: [] };
      const mockSendCommand = jest.fn().mockResolvedValue({ statusCode: 100, message: 'success', body: mockResponseBody });
      (SwitchBot as jest.Mock).mockImplementation(() => ({
        sendCommand: mockSendCommand,
      }));

      const RED = makeRED();
      switchBotCommand(RED);
      const nodeInstance = createNodeInstance(RED, makeConfig({ deviceId: 'device-1', command: 'turnOn' }));

      const msg: Record<string, unknown> = {};
      const send = jest.fn();
      const done = jest.fn();

      await getInputHandler(nodeInstance)(msg, send, done);

      // sendCommand が正しい引数で呼ばれることを確認
      expect(mockSendCommand).toHaveBeenCalledTimes(1);
      expect(mockSendCommand).toHaveBeenCalledWith('device-1', { commandType: 'command', command: 'turnOn' });
      // msg.payload にレスポンスのbodyがセットされることを確認
      expect(msg.payload).toEqual(mockResponseBody);
      // msg.command に送信したコマンドがセットされることを確認
      expect(msg.command).toEqual({ commandType: 'command', command: 'turnOn' });
      expect(send).toHaveBeenCalledTimes(1);
      expect(send).toHaveBeenCalledWith(msg);
      expect(done).toHaveBeenCalledTimes(1);
      expect(done).toHaveBeenCalledWith();
    });

    it('パラメータありコマンドを送信する', async () => {
      const mockSendCommand = jest.fn().mockResolvedValue({ statusCode: 100, message: 'success', body: {} });
      (SwitchBot as jest.Mock).mockImplementation(() => ({
        sendCommand: mockSendCommand,
      }));

      const RED = makeRED();
      switchBotCommand(RED);
      const nodeInstance = createNodeInstance(RED, makeConfig({
        command: 'setColorTemperature',
        parameter: '4000',
      }));

      await getInputHandler(nodeInstance)({}, jest.fn(), jest.fn());

      // パラメータが正しく渡されることを確認
      expect(mockSendCommand).toHaveBeenCalledWith('device-1', {
        commandType: 'command',
        command: 'setColorTemperature',
        parameter: '4000',
      });
    });

    it('空調コマンド（setAll）をパラメータ付きで送信する', async () => {
      const mockSendCommand = jest.fn().mockResolvedValue({ statusCode: 100, message: 'success', body: {} });
      (SwitchBot as jest.Mock).mockImplementation(() => ({
        sendCommand: mockSendCommand,
      }));

      const RED = makeRED();
      switchBotCommand(RED);
      const nodeInstance = createNodeInstance(RED, makeConfig({
        deviceType: 'Air Conditioner',
        command: 'setAll',
        parameter: '26,2,3,on',
      }));

      await getInputHandler(nodeInstance)({}, jest.fn(), jest.fn());

      // 空調パラメータ形式で送信されることを確認
      expect(mockSendCommand).toHaveBeenCalledWith('device-1', {
        commandType: 'command',
        command: 'setAll',
        parameter: '26,2,3,on',
      });
    });

    it('APIエラー時に done にエラーを渡す', async () => {
      const mockError = new Error('API Error');
      const mockSendCommand = jest.fn().mockRejectedValue(mockError);
      (SwitchBot as jest.Mock).mockImplementation(() => ({
        sendCommand: mockSendCommand,
      }));

      const RED = makeRED();
      switchBotCommand(RED);
      const nodeInstance = createNodeInstance(RED, makeConfig());

      const send = jest.fn();
      const done = jest.fn();

      await getInputHandler(nodeInstance)({}, send, done);

      // エラー時はsendを呼ばずdoneにエラーを渡すことを確認
      expect(send).not.toHaveBeenCalled();
      expect(done).toHaveBeenCalledTimes(1);
      expect(done).toHaveBeenCalledWith(mockError);
    });
  });
});
