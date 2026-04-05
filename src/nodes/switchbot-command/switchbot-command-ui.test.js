'use strict';

const ui = require('./switchbot-command-ui');

// ─── jQuery モックのヘルパー ───────────────────────────────────────────────────

/**
 * jQuery 要素モックを生成する
 * val() は引数なしでゲッター、引数ありでセッター（チェーン可）として機能する
 * @param {string} [initialVal=''] - val() の初期値
 */
const makeEl = (initialVal = '') => {
  let currentVal = initialVal;
  const el = {
    append: jest.fn(() => el),
    empty: jest.fn(() => el),
    on: jest.fn(() => el),
    text: jest.fn(() => el),
    val: jest.fn((v) => {
      if (v === undefined) return currentVal;
      currentVal = String(v);
      return el;
    }),
  };
  return el;
};

/**
 * $.getJSON の成功モックを生成する
 * @param {*} data - コールバックに渡すレスポンスデータ
 */
const makeGetJSON = (data) => {
  return jest.fn().mockImplementation((_url, successCb) => {
    const jqXHR = { fail: jest.fn(() => jqXHR) };
    if (successCb) successCb(data);
    return jqXHR;
  });
};

/**
 * $.getJSON の失敗モックを生成する
 */
const makeGetJSONFail = () => {
  return jest.fn().mockImplementation((_url, _successCb) => {
    const jqXHR = {
      fail: jest.fn((failCb) => {
        if (failCb) failCb();
        return jqXHR;
      }),
    };
    return jqXHR;
  });
};

// ─── $ モックのセットアップ ──────────────────────────────────────────────────

/** $() で生成された要素を selector ごとに追跡するリスト */
let createdElements;

/**
 * global.$ をセットアップする
 * @param {string} [configNodeId='config-node-1'] - #node-input-config の val() 戻り値
 */
const setup$ = (configNodeId = 'config-node-1') => {
  const configEl = makeEl(configNodeId);
  createdElements = [];

  const jqFn = jest.fn((selectorOrEl) => {
    // #node-input-config は設定ノードIDを返す専用の要素
    if (selectorOrEl === '#node-input-config') return configEl;
    // $(this) のような非文字列引数: change ハンドラ内での呼び出し
    if (typeof selectorOrEl !== 'string') {
      return makeEl('');
    }
    const el = makeEl();
    el._selector = selectorOrEl;
    createdElements.push(el);
    return el;
  });
  jqFn.getJSON = jest.fn();
  global.$ = jqFn;
};

// ─── テスト ──────────────────────────────────────────────────────────────────

describe('SWITCHBOT_COMMAND_DEVICE_TYPES', () => {
  it('6種類のデバイスタイプが定義されている', () => {
    expect(ui.SWITCHBOT_COMMAND_DEVICE_TYPES).toHaveLength(6);
  });

  it('各エントリに value と label がある', () => {
    ui.SWITCHBOT_COMMAND_DEVICE_TYPES.forEach((type) => {
      expect(type).toHaveProperty('value');
      expect(type).toHaveProperty('label');
    });
  });
});

// ─── fetchDevices ─────────────────────────────────────────────────────────────

describe('fetchDevices', () => {
  beforeEach(() => {
    setup$();
  });

  afterEach(() => {
    delete global.$;
  });

  it('configNodeId が空の場合はコールバックを呼んで終了する', () => {
    setup$('');
    const selectEl = makeEl();
    const callback = jest.fn();

    ui.fetchDevices('Plug Mini (JP)', selectEl, null, callback);

    expect(global.$.getJSON).not.toHaveBeenCalled();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('configNodeId が空かつコールバックが null の場合はエラーにならない', () => {
    setup$('');
    expect(() => {
      ui.fetchDevices('Plug Mini (JP)', makeEl(), null, null);
    }).not.toThrow();
  });

  it('Air Conditioner の場合は includeInfrared=true エンドポイントを使用する', () => {
    global.$.getJSON = makeGetJSON({ infraredRemoteList: [] });
    const callback = jest.fn();

    ui.fetchDevices('Air Conditioner', makeEl(), null, callback);

    expect(global.$.getJSON).toHaveBeenCalledWith(
      expect.stringContaining('includeInfrared=true'),
      expect.any(Function)
    );
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('Air Conditioner 以外は通常エンドポイントを使用する', () => {
    global.$.getJSON = makeGetJSON({ deviceList: [] });

    ui.fetchDevices('Plug Mini (JP)', makeEl(), null, jest.fn());

    expect(global.$.getJSON).toHaveBeenCalledWith(
      expect.not.stringContaining('includeInfrared'),
      expect.any(Function)
    );
  });

  it('Air Conditioner: infraredRemoteList から Air Conditioner タイプのみ絞り込む', () => {
    const devices = [
      { remoteType: 'Air Conditioner', deviceId: 'ac-1', deviceName: 'エアコン1' },
      { remoteType: 'TV', deviceId: 'tv-1', deviceName: 'テレビ1' },
    ];
    global.$.getJSON = makeGetJSON({ infraredRemoteList: devices });
    const selectEl = makeEl();

    ui.fetchDevices('Air Conditioner', selectEl, null, jest.fn());

    // Air Conditioner タイプの1件のみ append される
    expect(selectEl.append).toHaveBeenCalledTimes(1);
  });

  it('Air Conditioner で infraredRemoteList がない場合は deviceList を使用する', () => {
    const devices = [
      { deviceType: 'Air Conditioner', deviceId: 'ac-1', deviceName: 'AC1' },
    ];
    global.$.getJSON = makeGetJSON({ deviceList: devices });
    const selectEl = makeEl();

    ui.fetchDevices('Air Conditioner', selectEl, null, jest.fn());

    expect(selectEl.append).toHaveBeenCalledTimes(1);
  });

  it('deviceList から指定タイプで絞り込む', () => {
    const devices = [
      { deviceType: 'Plug Mini (JP)', deviceId: 'plug-1', deviceName: 'プラグ1' },
      { deviceType: 'Bot', deviceId: 'bot-1', deviceName: 'Bot1' },
    ];
    global.$.getJSON = makeGetJSON({ deviceList: devices });
    const selectEl = makeEl();

    ui.fetchDevices('Plug Mini (JP)', selectEl, null, jest.fn());

    // Plug Mini (JP) の1件のみ
    expect(selectEl.append).toHaveBeenCalledTimes(1);
  });

  it('Ceiling Light 選択時は Ceiling Light Pro も含めて絞り込む', () => {
    const devices = [
      { deviceType: 'Ceiling Light', deviceId: 'cl-1', deviceName: 'ライト1' },
      { deviceType: 'Ceiling Light Pro', deviceId: 'cl-2', deviceName: 'ライト2' },
      { deviceType: 'Bot', deviceId: 'bot-1', deviceName: 'Bot1' },
    ];
    global.$.getJSON = makeGetJSON({ deviceList: devices });
    const selectEl = makeEl();

    ui.fetchDevices('Ceiling Light', selectEl, null, jest.fn());

    // Ceiling Light + Ceiling Light Pro の2件
    expect(selectEl.append).toHaveBeenCalledTimes(2);
  });

  it('deviceList が存在しない場合はデバイスを追加しない', () => {
    global.$.getJSON = makeGetJSON({});
    const selectEl = makeEl();
    const callback = jest.fn();

    ui.fetchDevices('Plug Mini (JP)', selectEl, null, callback);

    expect(selectEl.append).not.toHaveBeenCalled();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('selectedId がある場合は全オプション追加後に val を設定する', () => {
    global.$.getJSON = makeGetJSON({
      deviceList: [{ deviceType: 'Bot', deviceId: 'bot-1', deviceName: 'Bot1' }],
    });
    const selectEl = makeEl();

    ui.fetchDevices('Bot', selectEl, 'bot-1', jest.fn());

    expect(selectEl.val).toHaveBeenCalledWith('bot-1');
  });

  it('selectedId が null の場合は val を設定しない', () => {
    global.$.getJSON = makeGetJSON({ deviceList: [] });
    const selectEl = makeEl();

    ui.fetchDevices('Bot', selectEl, null, jest.fn());

    expect(selectEl.val).not.toHaveBeenCalled();
  });

  it('data が null の場合はコールバックを呼んで終了する', () => {
    global.$.getJSON = makeGetJSON(null);
    const callback = jest.fn();

    ui.fetchDevices('Bot', makeEl(), null, callback);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('data が null かつコールバックが null の場合はエラーにならない', () => {
    global.$.getJSON = makeGetJSON(null);

    expect(() => {
      ui.fetchDevices('Bot', makeEl(), null, null);
    }).not.toThrow();
  });

  it('成功時にコールバックが null でもエラーにならない', () => {
    global.$.getJSON = makeGetJSON({ deviceList: [] });

    expect(() => {
      ui.fetchDevices('Plug Mini (JP)', makeEl(), null, null);
    }).not.toThrow();
  });

  it('API エラー時にコールバックを呼ぶ', () => {
    global.$.getJSON = makeGetJSONFail();
    const callback = jest.fn();

    ui.fetchDevices('Bot', makeEl(), null, callback);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('API エラー時にコールバックが null でもエラーにならない', () => {
    global.$.getJSON = makeGetJSONFail();

    expect(() => {
      ui.fetchDevices('Bot', makeEl(), null, null);
    }).not.toThrow();
  });
});

// ─── renderOperationUI ────────────────────────────────────────────────────────

describe('renderOperationUI', () => {
  beforeEach(() => {
    setup$();
  });

  afterEach(() => {
    delete global.$;
  });

  it('Ceiling Light → コマンドセレクトを含む Ceiling Light UI を描画する', () => {
    const container = makeEl();

    ui.renderOperationUI('Ceiling Light', container, { command: '' });

    expect(createdElements.some((e) => e._selector && e._selector.includes('switchbot-command-command'))).toBe(true);
  });

  it('Air Conditioner → コマンドセレクトを含む Air Conditioner UI を描画する', () => {
    const container = makeEl();

    ui.renderOperationUI('Air Conditioner', container, { command: '' });

    expect(createdElements.some((e) => e._selector && e._selector.includes('switchbot-command-command'))).toBe(true);
  });

  it('Bot → ON のみのスイッチUIを描画する', () => {
    const container = makeEl();

    ui.renderOperationUI('Bot', container, { command: 'turnOn' });

    const subCmdEl = createdElements.find((e) => e._selector && e._selector.includes('switchbot-command-sub-command'));
    // ON のみ1件
    expect(subCmdEl.append).toHaveBeenCalledTimes(1);
  });

  it('Plug Mini (JP) → ON/OFF のスイッチUIを描画する', () => {
    const container = makeEl();

    ui.renderOperationUI('Plug Mini (JP)', container, { command: 'turnOn' });

    const subCmdEl = createdElements.find((e) => e._selector && e._selector.includes('switchbot-command-sub-command'));
    // ON/OFF の2件
    expect(subCmdEl.append).toHaveBeenCalledTimes(2);
  });

  it('Humidifier2 → ON/OFF のスイッチUIを描画する', () => {
    const container = makeEl();

    ui.renderOperationUI('Humidifier2', container, { command: 'turnOff' });

    const subCmdEl = createdElements.find((e) => e._selector && e._selector.includes('switchbot-command-sub-command'));
    expect(subCmdEl.append).toHaveBeenCalledTimes(2);
  });
});

// ─── renderSwitchUI ───────────────────────────────────────────────────────────

describe('renderSwitchUI', () => {
  beforeEach(() => {
    setup$();
  });

  afterEach(() => {
    delete global.$;
  });

  it('node.command がある場合は val を設定する', () => {
    const container = makeEl();

    ui.renderSwitchUI(
      container,
      [{ value: 'turnOn', label: 'ON' }, { value: 'turnOff', label: 'OFF' }],
      { command: 'turnOff' }
    );

    const subCmdEl = createdElements.find((e) => e._selector && e._selector.includes('switchbot-command-sub-command'));
    expect(subCmdEl.val).toHaveBeenCalledWith('turnOff');
  });

  it('node.command が空の場合は val を設定しない', () => {
    const container = makeEl();

    ui.renderSwitchUI(container, [{ value: 'turnOn', label: 'ON' }], { command: '' });

    const subCmdEl = createdElements.find((e) => e._selector && e._selector.includes('switchbot-command-sub-command'));
    expect(subCmdEl.val).not.toHaveBeenCalled();
  });
});

// ─── renderCeilingLightUI ─────────────────────────────────────────────────────

describe('renderCeilingLightUI', () => {
  beforeEach(() => {
    setup$();
  });

  afterEach(() => {
    delete global.$;
  });

  it('初期コマンドが turnOn の場合は switch として描画する', () => {
    ui.renderCeilingLightUI(makeEl(), { command: 'turnOn' });

    const cmdSelEl = createdElements.find((e) => e._selector && e._selector.includes('switchbot-command-command'));
    expect(cmdSelEl.val).toHaveBeenCalledWith('switch');
  });

  it('初期コマンドが turnOff の場合は switch として描画する', () => {
    ui.renderCeilingLightUI(makeEl(), { command: 'turnOff' });

    const cmdSelEl = createdElements.find((e) => e._selector && e._selector.includes('switchbot-command-command'));
    expect(cmdSelEl.val).toHaveBeenCalledWith('switch');
  });

  it('初期コマンドが setBrightness の場合はそのまま描画する', () => {
    ui.renderCeilingLightUI(makeEl(), { command: 'setBrightness', parameter: '50' });

    const cmdSelEl = createdElements.find((e) => e._selector && e._selector.includes('switchbot-command-command'));
    expect(cmdSelEl.val).toHaveBeenCalledWith('setBrightness');
  });

  it('初期コマンドが空の場合は switch として描画する（|| switch フォールバック）', () => {
    ui.renderCeilingLightUI(makeEl(), { command: '' });

    const cmdSelEl = createdElements.find((e) => e._selector && e._selector.includes('switchbot-command-command'));
    expect(cmdSelEl.val).toHaveBeenCalledWith('switch');
  });

  it('コマンド変更時にサブUIを再描画する', () => {
    ui.renderCeilingLightUI(makeEl(), { command: '' });

    const subAreaEl = createdElements.find((e) => e._selector === '<div id="switchbot-command-sub">');
    const cmdSelEl = createdElements.find((e) => e._selector && e._selector.includes('switchbot-command-command'));

    // change ハンドラを取り出す
    const [eventName, handler] = cmdSelEl.on.mock.calls[0];
    expect(eventName).toBe('change');

    // 初回描画分をリセットして change ハンドラの再描画を検証する
    subAreaEl.empty.mockClear();
    handler.call({});

    // renderCeilingLightSubUI 内で empty が呼ばれる
    expect(subAreaEl.empty).toHaveBeenCalledTimes(1);
  });
});

// ─── renderCeilingLightSubUI ──────────────────────────────────────────────────

describe('renderCeilingLightSubUI', () => {
  beforeEach(() => {
    setup$();
  });

  afterEach(() => {
    delete global.$;
  });

  describe('switch コマンド', () => {
    it('node.command が turnOn の場合は turnOn を選択する', () => {
      ui.renderCeilingLightSubUI(makeEl(), 'switch', { command: 'turnOn' });

      const subCmdEl = createdElements.find((e) => e._selector && e._selector.includes('switchbot-command-sub-command'));
      expect(subCmdEl.val).toHaveBeenCalledWith('turnOn');
    });

    it('node.command が turnOff の場合は turnOff を選択する', () => {
      ui.renderCeilingLightSubUI(makeEl(), 'switch', { command: 'turnOff' });

      const subCmdEl = createdElements.find((e) => e._selector && e._selector.includes('switchbot-command-sub-command'));
      expect(subCmdEl.val).toHaveBeenCalledWith('turnOff');
    });

    it('node.command が turnOn/turnOff 以外の場合は val を設定しない', () => {
      ui.renderCeilingLightSubUI(makeEl(), 'switch', { command: 'switch' });

      const subCmdEl = createdElements.find((e) => e._selector && e._selector.includes('switchbot-command-sub-command'));
      expect(subCmdEl.val).not.toHaveBeenCalled();
    });
  });

  describe('setBrightness コマンド', () => {
    it('node.command が setBrightness の場合は保存値を復元する', () => {
      ui.renderCeilingLightSubUI(makeEl(), 'setBrightness', { command: 'setBrightness', parameter: '75' });

      const inputEl = createdElements.find((e) => e._selector && e._selector.includes('switchbot-command-param-value'));
      expect(inputEl.val).toHaveBeenCalledWith('75');
    });

    it('node.command が setBrightness でも parameter が未設定の場合は空文字を設定する', () => {
      ui.renderCeilingLightSubUI(makeEl(), 'setBrightness', { command: 'setBrightness', parameter: undefined });

      const inputEl = createdElements.find((e) => e._selector && e._selector.includes('switchbot-command-param-value'));
      expect(inputEl.val).toHaveBeenCalledWith('');
    });

    it('node.command が setBrightness でない場合は空文字を設定する', () => {
      ui.renderCeilingLightSubUI(makeEl(), 'setBrightness', { command: 'switch', parameter: '' });

      const inputEl = createdElements.find((e) => e._selector && e._selector.includes('switchbot-command-param-value'));
      expect(inputEl.val).toHaveBeenCalledWith('');
    });
  });

  describe('setColorTemperature コマンド', () => {
    it('node.command が setColorTemperature の場合は保存値を復元する', () => {
      ui.renderCeilingLightSubUI(makeEl(), 'setColorTemperature', { command: 'setColorTemperature', parameter: '4000' });

      const inputEl = createdElements.find((e) => e._selector && e._selector.includes('switchbot-command-param-value'));
      expect(inputEl.val).toHaveBeenCalledWith('4000');
    });

    it('node.command が setColorTemperature でも parameter が未設定の場合は空文字を設定する', () => {
      ui.renderCeilingLightSubUI(makeEl(), 'setColorTemperature', { command: 'setColorTemperature', parameter: undefined });

      const inputEl = createdElements.find((e) => e._selector && e._selector.includes('switchbot-command-param-value'));
      expect(inputEl.val).toHaveBeenCalledWith('');
    });

    it('node.command が setColorTemperature でない場合は空文字を設定する', () => {
      ui.renderCeilingLightSubUI(makeEl(), 'setColorTemperature', { command: 'switch', parameter: '' });

      const inputEl = createdElements.find((e) => e._selector && e._selector.includes('switchbot-command-param-value'));
      expect(inputEl.val).toHaveBeenCalledWith('');
    });
  });

  it('未知のコマンドの場合は container.empty() のみ呼ぶ', () => {
    const container = makeEl();

    ui.renderCeilingLightSubUI(container, 'unknown', { command: '' });

    expect(container.empty).toHaveBeenCalledTimes(1);
    // 新しい要素は作られない
    expect(createdElements).toHaveLength(0);
  });
});

// ─── renderAirConditionerUI ───────────────────────────────────────────────────

describe('renderAirConditionerUI', () => {
  beforeEach(() => {
    setup$();
  });

  afterEach(() => {
    delete global.$;
  });

  it('初期コマンドが turnOn の場合は switch として描画する', () => {
    ui.renderAirConditionerUI(makeEl(), { command: 'turnOn' });

    const cmdSelEl = createdElements.find((e) => e._selector && e._selector.includes('switchbot-command-command'));
    expect(cmdSelEl.val).toHaveBeenCalledWith('switch');
  });

  it('初期コマンドが turnOff の場合は switch として描画する', () => {
    ui.renderAirConditionerUI(makeEl(), { command: 'turnOff' });

    const cmdSelEl = createdElements.find((e) => e._selector && e._selector.includes('switchbot-command-command'));
    expect(cmdSelEl.val).toHaveBeenCalledWith('switch');
  });

  it('初期コマンドが setAll の場合は setAll として描画する', () => {
    ui.renderAirConditionerUI(makeEl(), { command: 'setAll', parameter: '26,2,3,on' });

    const cmdSelEl = createdElements.find((e) => e._selector && e._selector.includes('switchbot-command-command'));
    expect(cmdSelEl.val).toHaveBeenCalledWith('setAll');
  });

  it('初期コマンドが空の場合は switch として描画する（|| switch フォールバック）', () => {
    ui.renderAirConditionerUI(makeEl(), { command: '' });

    const cmdSelEl = createdElements.find((e) => e._selector && e._selector.includes('switchbot-command-command'));
    expect(cmdSelEl.val).toHaveBeenCalledWith('switch');
  });

  it('コマンド変更時にサブUIを再描画する', () => {
    ui.renderAirConditionerUI(makeEl(), { command: '' });

    const subAreaEl = createdElements.find((e) => e._selector === '<div id="switchbot-command-sub">');
    const cmdSelEl = createdElements.find((e) => e._selector && e._selector.includes('switchbot-command-command'));

    const [eventName, handler] = cmdSelEl.on.mock.calls[0];
    expect(eventName).toBe('change');

    subAreaEl.empty.mockClear();
    handler.call({});

    expect(subAreaEl.empty).toHaveBeenCalledTimes(1);
  });
});

// ─── renderAirConditionerSubUI ────────────────────────────────────────────────

describe('renderAirConditionerSubUI', () => {
  beforeEach(() => {
    setup$();
  });

  afterEach(() => {
    delete global.$;
  });

  describe('switch コマンド', () => {
    it('node.command がある場合は val を設定する', () => {
      ui.renderAirConditionerSubUI(makeEl(), 'switch', { command: 'turnOff' });

      const subCmdEl = createdElements.find((e) => e._selector && e._selector.includes('switchbot-command-sub-command'));
      expect(subCmdEl.val).toHaveBeenCalledWith('turnOff');
    });

    it('node.command が空の場合は val を設定しない', () => {
      ui.renderAirConditionerSubUI(makeEl(), 'switch', { command: '' });

      const subCmdEl = createdElements.find((e) => e._selector && e._selector.includes('switchbot-command-sub-command'));
      expect(subCmdEl.val).not.toHaveBeenCalled();
    });
  });

  describe('setAll コマンド', () => {
    it('保存済みパラメータを分解して各フィールドを復元する', () => {
      ui.renderAirConditionerSubUI(makeEl(), 'setAll', { command: 'setAll', parameter: '26,2,3,on' });

      const tempEl = createdElements.find((e) => e._selector && e._selector.includes('switchbot-ac-temperature'));
      const modeEl = createdElements.find((e) => e._selector && e._selector.includes('switchbot-ac-mode'));
      const fanEl = createdElements.find((e) => e._selector && e._selector.includes('switchbot-ac-fan'));

      expect(tempEl.val).toHaveBeenCalledWith('26');
      expect(modeEl.val).toHaveBeenCalledWith('2');
      expect(fanEl.val).toHaveBeenCalledWith('3');
    });

    it('パラメータが空の場合はデフォルト値（モード:1, 風量:1）を使用する', () => {
      ui.renderAirConditionerSubUI(makeEl(), 'setAll', { command: 'setAll', parameter: '' });

      const tempEl = createdElements.find((e) => e._selector && e._selector.includes('switchbot-ac-temperature'));
      const modeEl = createdElements.find((e) => e._selector && e._selector.includes('switchbot-ac-mode'));
      const fanEl = createdElements.find((e) => e._selector && e._selector.includes('switchbot-ac-fan'));

      expect(tempEl.val).toHaveBeenCalledWith('');
      expect(modeEl.val).toHaveBeenCalledWith('1');
      expect(fanEl.val).toHaveBeenCalledWith('1');
    });

    it('parameter が undefined の場合はデフォルト値を使用する', () => {
      ui.renderAirConditionerSubUI(makeEl(), 'setAll', { command: 'setAll', parameter: undefined });

      const modeEl = createdElements.find((e) => e._selector && e._selector.includes('switchbot-ac-mode'));
      const fanEl = createdElements.find((e) => e._selector && e._selector.includes('switchbot-ac-fan'));

      expect(modeEl.val).toHaveBeenCalledWith('1');
      expect(fanEl.val).toHaveBeenCalledWith('1');
    });
  });

  it('未知のコマンドの場合は container.empty() のみ呼ぶ', () => {
    const container = makeEl();

    ui.renderAirConditionerSubUI(container, 'unknown', { command: '' });

    expect(container.empty).toHaveBeenCalledTimes(1);
    expect(createdElements).toHaveLength(0);
  });
});
