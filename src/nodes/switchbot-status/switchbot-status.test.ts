import { NodeAPI } from '@node-red/registry';
import switchBotStatus, {
  SUPPORTED_DEVICE_TYPES,
  SwitchBotStatusNode,
  SwitchBotStatusNodeDef,
} from './switchbot-status';
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
const makeConfig = (overrides: Partial<SwitchBotStatusNodeDef> = {}): SwitchBotStatusNodeDef => ({
  id: 'status-node-1',
  type: 'switchbot-status',
  name: 'test status',
  z: '',
  config: 'config-node-1',
  deviceType: 'Plug Mini (JP)',
  deviceId: 'device-1',
  ...overrides,
} as SwitchBotStatusNodeDef);

/** コンストラクタを取り出してノードインスタンスを生成する */
const createNodeInstance = (RED: NodeAPI, config: SwitchBotStatusNodeDef): SwitchBotStatusNode => {
  const Constructor = (RED.nodes.registerType as jest.Mock).mock.calls[0][1] as (
    this: SwitchBotStatusNode,
    config: SwitchBotStatusNodeDef
  ) => void;
  const nodeInstance = { on: jest.fn() } as unknown as SwitchBotStatusNode;
  Constructor.call(nodeInstance, config);
  return nodeInstance;
};

describe('switchbot-status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerType', () => {
    it('switchbot-status という名前でノードを登録する', () => {
      const RED = makeRED();

      switchBotStatus(RED);

      expect(RED.nodes.registerType).toHaveBeenCalledTimes(1);
      expect(RED.nodes.registerType).toHaveBeenCalledWith('switchbot-status', expect.any(Function));
    });
  });

  describe('SUPPORTED_DEVICE_TYPES', () => {
    it('対応デバイスタイプが正しく定義されている', () => {
      expect(SUPPORTED_DEVICE_TYPES).toContain('Plug Mini (JP)');
      expect(SUPPORTED_DEVICE_TYPES).toContain('Bot');
      expect(SUPPORTED_DEVICE_TYPES).toContain('Ceiling Light');
      expect(SUPPORTED_DEVICE_TYPES).toContain('Humidifier2');
      expect(SUPPORTED_DEVICE_TYPES).toContain('Air Purifier Table VOC');
      expect(SUPPORTED_DEVICE_TYPES).toContain('Meter');
    });

    it('Ceiling Light Pro は統合されているため含まれない', () => {
      expect(SUPPORTED_DEVICE_TYPES).not.toContain('Ceiling Light Pro');
    });

    it('MeterPro(CO2) は統合されているため含まれない', () => {
      expect(SUPPORTED_DEVICE_TYPES).not.toContain('MeterPro(CO2)');
    });
  });

  describe('ノードコンストラクタ', () => {
    it('ノードプロパティを正しく設定する', () => {
      const RED = makeRED();
      switchBotStatus(RED);

      const config = makeConfig();
      const nodeInstance = createNodeInstance(RED, config);

      expect(RED.nodes.createNode).toHaveBeenCalledTimes(1);
      expect(RED.nodes.createNode).toHaveBeenCalledWith(nodeInstance, config);
      expect(nodeInstance.config).toBe('config-node-1');
      expect(nodeInstance.deviceType).toBe('Plug Mini (JP)');
      expect(nodeInstance.deviceId).toBe('device-1');
    });

    it('設定ノードから認証情報を取得してSwitchBotを初期化する', () => {
      const RED = makeRED({ token: 'my-token', secret: 'my-secret' });
      switchBotStatus(RED);

      const config = makeConfig({ config: 'config-node-1' });
      createNodeInstance(RED, config);

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
      switchBotStatus(RED);

      const nodeInstance = createNodeInstance(RED, makeConfig());

      expect(nodeInstance.on).toHaveBeenCalledTimes(1);
      expect(nodeInstance.on).toHaveBeenCalledWith('input', expect.any(Function));
    });
  });

  describe('input イベント', () => {
    /** inputハンドラを取り出す */
    const getInputHandler = (nodeInstance: SwitchBotStatusNode) => {
      return (nodeInstance.on as jest.Mock).mock.calls[0][1] as (
        msg: Record<string, unknown>,
        send: jest.Mock,
        done: jest.Mock
      ) => Promise<void>;
    };

    it('デバイスのステータスを取得してmsg.payloadにセットする', async () => {
      const mockStatus = {
        deviceId: 'device-1',
        deviceType: 'Plug Mini (JP)',
        hubDeviceId: 'device-1',
        version: 'V2.7-2.7',
        power: 'on',
        voltage: 102.6,
        weight: 128.4,
        electricityOfDay: 301,
        electricCurrent: 1666,
      };
      const mockGetDeviceStatus = jest.fn().mockResolvedValue({ statusCode: 100, message: 'success', body: mockStatus });
      (SwitchBot as jest.Mock).mockImplementation(() => ({
        getDeviceStatus: mockGetDeviceStatus,
      }));

      const RED = makeRED();
      switchBotStatus(RED);
      const nodeInstance = createNodeInstance(RED, makeConfig({ deviceId: 'device-1' }));

      const msg: Record<string, unknown> = {};
      const send = jest.fn();
      const done = jest.fn();

      await getInputHandler(nodeInstance)(msg, send, done);

      // getDeviceStatus が正しいデバイスIDで呼ばれることを確認
      expect(mockGetDeviceStatus).toHaveBeenCalledTimes(1);
      expect(mockGetDeviceStatus).toHaveBeenCalledWith('device-1');
      // msg.payload にステータスのbodyがセットされることを確認
      expect(msg.payload).toEqual(mockStatus);
      expect(send).toHaveBeenCalledTimes(1);
      expect(send).toHaveBeenCalledWith(msg);
      expect(done).toHaveBeenCalledTimes(1);
      expect(done).toHaveBeenCalledWith();
    });

    it('APIエラー時に done にエラーを渡す', async () => {
      const mockError = new Error('API Error');
      const mockGetDeviceStatus = jest.fn().mockRejectedValue(mockError);
      (SwitchBot as jest.Mock).mockImplementation(() => ({
        getDeviceStatus: mockGetDeviceStatus,
      }));

      const RED = makeRED();
      switchBotStatus(RED);
      const nodeInstance = createNodeInstance(RED, makeConfig());

      const msg: Record<string, unknown> = {};
      const send = jest.fn();
      const done = jest.fn();

      await getInputHandler(nodeInstance)(msg, send, done);

      // エラー時はsendを呼ばずdoneにエラーを渡すことを確認
      expect(send).not.toHaveBeenCalled();
      expect(done).toHaveBeenCalledTimes(1);
      expect(done).toHaveBeenCalledWith(mockError);
    });
  });
});
