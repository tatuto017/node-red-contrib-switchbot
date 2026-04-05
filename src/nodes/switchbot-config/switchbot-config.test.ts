import { NodeAPI, NodeDef } from '@node-red/registry';
import switchBotConfig, { SwitchBotConfigNode, SwitchBotConfigNodeDef } from './switchbot-config';
import { SwitchBot } from '../../switchbot/switchbot';

// SwitchBotクラスをモック化する
jest.mock('../../switchbot/switchbot');
// fetchHttpClientをモック化する
jest.mock('../../switchbot/fetchHttpClient', () => ({
  fetchHttpClient: {},
}));

/**
 * テスト用 NodeAPI モックを生成する
 * @param configNode - getNode が返す設定ノードの内容
 */
const makeRED = (configNode: Partial<SwitchBotConfigNode> = {}): NodeAPI => {
  return {
    nodes: {
      registerType: jest.fn(),
      createNode: jest.fn(),
      getNode: jest.fn().mockReturnValue(configNode),
    },
    httpAdmin: {
      get: jest.fn(),
    },
  } as unknown as NodeAPI;
};

/**
 * httpAdmin.get に登録されたハンドラを取り出す
 * @param RED - NodeAPI モック
 * @param path - エンドポイントパス
 */
const getHandler = (RED: NodeAPI, path: string) => {
  const call = (RED as any).httpAdmin.get.mock.calls.find((c: any[]) => c[0] === path);
  return call[1] as (
    req: { query: Record<string, string> },
    res: { status: jest.Mock; json: jest.Mock }
  ) => Promise<void>;
};

/** /switchbot/device-types ハンドラを取り出す */
const getDeviceTypesHandler = (RED: NodeAPI) => getHandler(RED, '/switchbot/device-types');

/** /switchbot/devices ハンドラを取り出す */
const getDevicesHandler = (RED: NodeAPI) => getHandler(RED, '/switchbot/devices');

/** /switchbot/command-ui.js ハンドラを取り出す */
const getCommandUiHandler = (RED: NodeAPI) => getHandler(RED, '/switchbot/command-ui.js');

/** /switchbot/status-ui.js ハンドラを取り出す */
const getStatusUiHandler = (RED: NodeAPI) => getHandler(RED, '/switchbot/status-ui.js');

/** テスト用レスポンスオブジェクトを生成する */
const makeRes = () => {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
    sendFile: jest.fn(),
  };
  // res.status(...).json(...) チェーンに対応する
  res.status.mockReturnValue(res);
  return res;
};

describe('switchbot-config', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerType', () => {
    it('switchbot-config という名前でノードを登録する', () => {
      const RED = makeRED();

      switchBotConfig(RED);

      expect(RED.nodes.registerType).toHaveBeenCalledTimes(1);
      expect(RED.nodes.registerType).toHaveBeenCalledWith('switchbot-config', expect.any(Function));
    });
  });

  describe('httpAdmin /switchbot/device-types', () => {
    it('/switchbot/device-types エンドポイントを登録する', () => {
      const RED = makeRED();

      switchBotConfig(RED);

      expect((RED as any).httpAdmin.get).toHaveBeenCalledWith('/switchbot/device-types', expect.any(Function));
    });

    it('設定ノードが見つからない場合は 404 を返す', async () => {
      const RED = makeRED();
      (RED.nodes.getNode as jest.Mock).mockReturnValue(null);
      switchBotConfig(RED);

      const handler = getDeviceTypesHandler(RED);
      const req = { query: { configId: 'config-node-1' } };
      const res = makeRes();

      await handler(req, res as any);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Config node not found' });
    });

    it('デバイス一覧から一意のデバイスタイプを抽出して返す', async () => {
      const mockDeviceList = [
        { deviceId: 'd1', deviceType: 'Plug Mini (JP)', deviceName: 'Plug1' },
        { deviceId: 'd2', deviceType: 'Bot', deviceName: 'Bot1' },
        { deviceId: 'd3', deviceType: 'Plug Mini (JP)', deviceName: 'Plug2' },
      ];
      const mockGetDevices = jest.fn().mockResolvedValue({
        statusCode: 100,
        message: 'success',
        body: { deviceList: mockDeviceList, infraredRemoteList: [] },
      });
      (SwitchBot as jest.Mock).mockImplementation(() => ({ getDevices: mockGetDevices }));

      const RED = makeRED({ token: 'my-token', secret: 'my-secret' });
      switchBotConfig(RED);

      const handler = getDeviceTypesHandler(RED);
      const req = { query: { configId: 'config-node-1' } };
      const res = makeRes();

      await handler(req, res as any);

      // 重複を除いたデバイスタイプ一覧が返ることを確認
      expect(res.json).toHaveBeenCalledWith(['Plug Mini (JP)', 'Bot']);
    });

    it('body に deviceList がない場合は空配列を返す', async () => {
      const mockGetDevices = jest.fn().mockResolvedValue({
        statusCode: 100,
        message: 'success',
        body: {},
      });
      (SwitchBot as jest.Mock).mockImplementation(() => ({ getDevices: mockGetDevices }));

      const RED = makeRED({ token: 'my-token', secret: 'my-secret' });
      switchBotConfig(RED);

      const handler = getDeviceTypesHandler(RED);
      const req = { query: { configId: 'config-node-1' } };
      const res = makeRes();

      await handler(req, res as any);

      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('API エラー時は 500 を返す', async () => {
      const mockGetDevices = jest.fn().mockRejectedValue(new Error('API Error'));
      (SwitchBot as jest.Mock).mockImplementation(() => ({ getDevices: mockGetDevices }));

      const RED = makeRED({ token: 'my-token', secret: 'my-secret' });
      switchBotConfig(RED);

      const handler = getDeviceTypesHandler(RED);
      const req = { query: { configId: 'config-node-1' } };
      const res = makeRes();

      await handler(req, res as any);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error: API Error' });
    });
  });

  describe('httpAdmin UIファイル配信', () => {
    it('4つの httpAdmin.get エンドポイントを登録する', () => {
      const RED = makeRED();

      switchBotConfig(RED);

      expect((RED as any).httpAdmin.get).toHaveBeenCalledTimes(4);
    });

    it('/switchbot/command-ui.js を switchbot-command-ui.js のパスで返す', async () => {
      const RED = makeRED();
      switchBotConfig(RED);

      const handler = getCommandUiHandler(RED);
      const res = makeRes();

      await handler({} as any, res as any);

      expect(res.sendFile).toHaveBeenCalledTimes(1);
      expect((res.sendFile as jest.Mock).mock.calls[0][0]).toContain('switchbot-command-ui.js');
    });

    it('/switchbot/status-ui.js を switchbot-status-ui.js のパスで返す', async () => {
      const RED = makeRED();
      switchBotConfig(RED);

      const handler = getStatusUiHandler(RED);
      const res = makeRes();

      await handler({} as any, res as any);

      expect(res.sendFile).toHaveBeenCalledTimes(1);
      expect((res.sendFile as jest.Mock).mock.calls[0][0]).toContain('switchbot-status-ui.js');
    });
  });

  describe('httpAdmin /switchbot/devices', () => {
    it('/switchbot/devices エンドポイントを登録する', () => {
      const RED = makeRED();

      switchBotConfig(RED);

      expect((RED as any).httpAdmin.get).toHaveBeenCalledWith('/switchbot/devices', expect.any(Function));
    });

    it('設定ノードが見つからない場合は 404 を返す', async () => {
      const RED = makeRED();
      // getNode が null を返すように設定する
      (RED.nodes.getNode as jest.Mock).mockReturnValue(null);
      switchBotConfig(RED);

      const handler = getDevicesHandler(RED);
      const req = { query: { configId: 'config-node-1' } };
      const res = makeRes();

      await handler(req, res as any);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Config node not found' });
    });

    it('デバイス一覧を取得して infraredRemoteList を除いて返す', async () => {
      const mockDeviceList = [{ deviceId: 'd1', deviceType: 'Plug Mini (JP)', deviceName: 'Plug' }];
      const mockInfraredList = [{ deviceId: 'i1', remoteType: 'Air Conditioner', deviceName: 'AC' }];
      const mockGetDevices = jest.fn().mockResolvedValue({
        statusCode: 100,
        message: 'success',
        body: { deviceList: mockDeviceList, infraredRemoteList: mockInfraredList },
      });
      (SwitchBot as jest.Mock).mockImplementation(() => ({ getDevices: mockGetDevices }));

      const RED = makeRED({ token: 'my-token', secret: 'my-secret' });
      switchBotConfig(RED);

      const handler = getDevicesHandler(RED);
      const req = { query: { configId: 'config-node-1' } };
      const res = makeRes();

      await handler(req, res as any);

      // SwitchBot が認証情報で初期化されることを確認
      expect(SwitchBot).toHaveBeenCalledWith(
        { token: 'my-token', secret: 'my-secret' },
        expect.any(Object)
      );
      // infraredRemoteList を含まないレスポンスが返ることを確認
      expect(res.json).toHaveBeenCalledWith({ deviceList: mockDeviceList });
    });

    it('includeInfrared=true の場合は infraredRemoteList を含めて返す', async () => {
      const mockDeviceList = [{ deviceId: 'd1', deviceType: 'Plug Mini (JP)', deviceName: 'Plug' }];
      const mockInfraredList = [{ deviceId: 'i1', remoteType: 'Air Conditioner', deviceName: 'AC' }];
      const mockGetDevices = jest.fn().mockResolvedValue({
        statusCode: 100,
        message: 'success',
        body: { deviceList: mockDeviceList, infraredRemoteList: mockInfraredList },
      });
      (SwitchBot as jest.Mock).mockImplementation(() => ({ getDevices: mockGetDevices }));

      const RED = makeRED({ token: 'my-token', secret: 'my-secret' });
      switchBotConfig(RED);

      const handler = getDevicesHandler(RED);
      const req = { query: { configId: 'config-node-1', includeInfrared: 'true' } };
      const res = makeRes();

      await handler(req, res as any);

      // infraredRemoteList を含むレスポンスが返ることを確認
      expect(res.json).toHaveBeenCalledWith({
        deviceList: mockDeviceList,
        infraredRemoteList: mockInfraredList,
      });
    });

    it('API エラー時は 500 を返す', async () => {
      const mockGetDevices = jest.fn().mockRejectedValue(new Error('API Error'));
      (SwitchBot as jest.Mock).mockImplementation(() => ({ getDevices: mockGetDevices }));

      const RED = makeRED({ token: 'my-token', secret: 'my-secret' });
      switchBotConfig(RED);

      const handler = getDevicesHandler(RED);
      const req = { query: { configId: 'config-node-1' } };
      const res = makeRes();

      await handler(req, res as any);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error: API Error' });
    });
  });

  describe('ノードコンストラクタ', () => {
    it('token と secret をノードインスタンスに設定する', () => {
      const RED = makeRED();
      switchBotConfig(RED);

      // registerType に渡されたコンストラクタ関数を取り出す
      const Constructor = (RED.nodes.registerType as jest.Mock).mock.calls[0][1] as (
        this: SwitchBotConfigNode,
        config: SwitchBotConfigNodeDef
      ) => void;

      const config: SwitchBotConfigNodeDef = {
        id: 'config-node-1',
        type: 'switchbot-config',
        name: 'test config',
        token: 'my-token',
        secret: 'my-secret',
        z: '',
      } as SwitchBotConfigNodeDef & NodeDef;

      const nodeInstance = {} as SwitchBotConfigNode;

      // コンストラクタをnodeInstanceのコンテキストで呼び出す
      Constructor.call(nodeInstance, config);

      // token と secret が正しく設定されていることを確認
      expect(RED.nodes.createNode).toHaveBeenCalledTimes(1);
      expect(RED.nodes.createNode).toHaveBeenCalledWith(nodeInstance, config);
      expect(nodeInstance.token).toBe('my-token');
      expect(nodeInstance.secret).toBe('my-secret');
    });
  });
});
