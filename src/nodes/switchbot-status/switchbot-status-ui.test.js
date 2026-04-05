'use strict';

const ui = require('./switchbot-status-ui');

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

// ─── $ モックのセットアップ ──────────────────────────────────────────────────

/** $() で生成された要素を追跡するリスト */
let createdElements;

/**
 * global.$ をセットアップする
 * @param {string} [configNodeId='config-node-1'] - #node-input-config の val() 戻り値
 */
const setup$ = (configNodeId = 'config-node-1') => {
  const configEl = makeEl(configNodeId);
  createdElements = [];

  const jqFn = jest.fn((selectorOrEl) => {
    if (selectorOrEl === '#node-input-config') return configEl;
    if (typeof selectorOrEl !== 'string') return makeEl('');
    const el = makeEl();
    el._selector = selectorOrEl;
    createdElements.push(el);
    return el;
  });
  jqFn.getJSON = jest.fn();
  global.$ = jqFn;
};

// ─── テスト ──────────────────────────────────────────────────────────────────

describe('SWITCHBOT_STATUS_DEVICE_TYPE_LABELS', () => {
  it('全サポートタイプのラベルが定義されている', () => {
    const labels = ui.SWITCHBOT_STATUS_DEVICE_TYPE_LABELS;
    expect(labels['Plug Mini (JP)']).toBe('スマートプラグ');
    expect(labels['Bot']).toBe('Bot');
    expect(labels['Ceiling Light']).toBe('シーリングライト');
    expect(labels['Ceiling Light Pro']).toBe('シーリングライト');
    expect(labels['Humidifier2']).toBe('除湿機');
    expect(labels['Air Purifier Table VOC']).toBe('空気清浄機');
    expect(labels['Meter']).toBe('温湿度計');
    expect(labels['MeterPro(CO2)']).toBe('温湿度計');
  });
});

describe('SWITCHBOT_STATUS_SUPPORTED_TYPES', () => {
  it('6種類のサポートタイプが定義されている', () => {
    expect(ui.SWITCHBOT_STATUS_SUPPORTED_TYPES).toHaveLength(6);
  });

  it('Ceiling Light Pro と MeterPro(CO2) は含まれない（統合済み）', () => {
    expect(ui.SWITCHBOT_STATUS_SUPPORTED_TYPES).not.toContain('Ceiling Light Pro');
    expect(ui.SWITCHBOT_STATUS_SUPPORTED_TYPES).not.toContain('MeterPro(CO2)');
  });
});

// ─── fetchStatusDeviceTypes ───────────────────────────────────────────────────

describe('fetchStatusDeviceTypes', () => {
  beforeEach(() => {
    setup$();
  });

  afterEach(() => {
    delete global.$;
  });

  it('configNodeId が空の場合は何もしない', () => {
    setup$('');
    const typeSelectEl = makeEl();

    ui.fetchStatusDeviceTypes(typeSelectEl, null, makeEl(), null);

    expect(global.$.getJSON).not.toHaveBeenCalled();
  });

  it('Ceiling Light Pro を Ceiling Light に正規化する', () => {
    global.$.getJSON = jest.fn().mockImplementation((_url, cb) => {
      cb(['Ceiling Light Pro']);
      return { fail: jest.fn() };
    });
    const typeSelectEl = makeEl();

    ui.fetchStatusDeviceTypes(typeSelectEl, null, makeEl(), null);

    // 正規化後 'Ceiling Light' がオプションとして追加される
    expect(typeSelectEl.append).toHaveBeenCalledTimes(1);
  });

  it('MeterPro(CO2) を Meter に正規化する', () => {
    global.$.getJSON = jest.fn().mockImplementation((_url, cb) => {
      cb(['MeterPro(CO2)']);
      return { fail: jest.fn() };
    });
    const typeSelectEl = makeEl();

    ui.fetchStatusDeviceTypes(typeSelectEl, null, makeEl(), null);

    expect(typeSelectEl.append).toHaveBeenCalledTimes(1);
  });

  it('重複するタイプを除外して一意にする', () => {
    global.$.getJSON = jest.fn().mockImplementation((_url, cb) => {
      // Ceiling Light と Ceiling Light Pro → 正規化後 Ceiling Light が2件 → 重複除去で1件
      cb(['Ceiling Light', 'Ceiling Light Pro']);
      return { fail: jest.fn() };
    });
    const typeSelectEl = makeEl();

    ui.fetchStatusDeviceTypes(typeSelectEl, null, makeEl(), null);

    expect(typeSelectEl.append).toHaveBeenCalledTimes(1);
  });

  it('サポート対象外のタイプは表示しない', () => {
    global.$.getJSON = jest.fn().mockImplementation((_url, cb) => {
      cb(['UnknownDevice']);
      return { fail: jest.fn() };
    });
    const typeSelectEl = makeEl();

    ui.fetchStatusDeviceTypes(typeSelectEl, null, makeEl(), null);

    // SUPPORTED_TYPES に含まれないため追加されない
    expect(typeSelectEl.append).not.toHaveBeenCalled();
  });

  it('selectedType がある場合は val を設定する', () => {
    global.$.getJSON = jest.fn().mockImplementation((_url, cb) => {
      cb(['Ceiling Light']);
      return { fail: jest.fn() };
    });
    const typeSelectEl = makeEl();

    ui.fetchStatusDeviceTypes(typeSelectEl, 'Ceiling Light', makeEl(), null);

    expect(typeSelectEl.val).toHaveBeenCalledWith('Ceiling Light');
  });

  it('selectedType が null の場合は val を設定しない', () => {
    global.$.getJSON = jest.fn().mockImplementation((_url, cb) => {
      cb([]);
      return { fail: jest.fn() };
    });
    const typeSelectEl = makeEl();

    ui.fetchStatusDeviceTypes(typeSelectEl, null, makeEl(), null);

    expect(typeSelectEl.val).not.toHaveBeenCalledWith(expect.anything());
  });

  it('currentType がある場合は fetchStatusDevices を呼ぶ', () => {
    // device-types と devices 両方の $.getJSON を処理する
    global.$.getJSON = jest.fn().mockImplementation((url, cb) => {
      if (url.includes('device-types')) {
        cb(['Ceiling Light']);
      } else {
        cb({ deviceList: [] });
      }
      return { fail: jest.fn() };
    });
    const typeSelectEl = makeEl('Ceiling Light');
    const deviceSelectEl = makeEl();

    ui.fetchStatusDeviceTypes(typeSelectEl, 'Ceiling Light', deviceSelectEl, null);

    // device-types と devices の2回 $.getJSON が呼ばれる
    expect(global.$.getJSON).toHaveBeenCalledTimes(2);
  });

  it('currentType が空の場合は fetchStatusDevices を呼ばない', () => {
    global.$.getJSON = jest.fn().mockImplementation((_url, cb) => {
      cb([]);
      return { fail: jest.fn() };
    });
    const typeSelectEl = makeEl(''); // val() が '' を返す
    const deviceSelectEl = makeEl();

    ui.fetchStatusDeviceTypes(typeSelectEl, null, deviceSelectEl, null);

    // device-types のみ1回
    expect(global.$.getJSON).toHaveBeenCalledTimes(1);
  });
});

// ─── fetchStatusDevices ───────────────────────────────────────────────────────

describe('fetchStatusDevices', () => {
  beforeEach(() => {
    setup$();
  });

  afterEach(() => {
    delete global.$;
  });

  it('configNodeId が空の場合は何もしない', () => {
    setup$('');

    ui.fetchStatusDevices('Ceiling Light', makeEl(), null);

    expect(global.$.getJSON).not.toHaveBeenCalled();
  });

  it('data が null の場合は何もしない', () => {
    global.$.getJSON = jest.fn().mockImplementation((_url, cb) => {
      cb(null);
      return { fail: jest.fn() };
    });
    const selectEl = makeEl();

    ui.fetchStatusDevices('Ceiling Light', selectEl, null);

    expect(selectEl.append).not.toHaveBeenCalled();
  });

  it('data.deviceList が null の場合は何もしない', () => {
    global.$.getJSON = jest.fn().mockImplementation((_url, cb) => {
      cb({ deviceList: null });
      return { fail: jest.fn() };
    });
    const selectEl = makeEl();

    ui.fetchStatusDevices('Ceiling Light', selectEl, null);

    expect(selectEl.append).not.toHaveBeenCalled();
  });

  it('Ceiling Light 選択時は Ceiling Light Pro も含めて絞り込む', () => {
    const devices = [
      { deviceType: 'Ceiling Light', deviceId: 'cl-1', deviceName: 'ライト1' },
      { deviceType: 'Ceiling Light Pro', deviceId: 'cl-2', deviceName: 'ライト2' },
      { deviceType: 'Bot', deviceId: 'bot-1', deviceName: 'Bot1' },
    ];
    global.$.getJSON = jest.fn().mockImplementation((_url, cb) => {
      cb({ deviceList: devices });
      return { fail: jest.fn() };
    });
    const selectEl = makeEl();

    ui.fetchStatusDevices('Ceiling Light', selectEl, null);

    // Ceiling Light + Ceiling Light Pro の2件
    expect(selectEl.append).toHaveBeenCalledTimes(2);
  });

  it('Meter 選択時は MeterPro(CO2) も含めて絞り込む', () => {
    const devices = [
      { deviceType: 'Meter', deviceId: 'm-1', deviceName: 'メーター1' },
      { deviceType: 'MeterPro(CO2)', deviceId: 'm-2', deviceName: 'メーターPro1' },
      { deviceType: 'Bot', deviceId: 'bot-1', deviceName: 'Bot1' },
    ];
    global.$.getJSON = jest.fn().mockImplementation((_url, cb) => {
      cb({ deviceList: devices });
      return { fail: jest.fn() };
    });
    const selectEl = makeEl();

    ui.fetchStatusDevices('Meter', selectEl, null);

    // Meter + MeterPro(CO2) の2件
    expect(selectEl.append).toHaveBeenCalledTimes(2);
  });

  it('その他のタイプは deviceType が一致するもののみ絞り込む', () => {
    const devices = [
      { deviceType: 'Plug Mini (JP)', deviceId: 'plug-1', deviceName: 'プラグ1' },
      { deviceType: 'Bot', deviceId: 'bot-1', deviceName: 'Bot1' },
    ];
    global.$.getJSON = jest.fn().mockImplementation((_url, cb) => {
      cb({ deviceList: devices });
      return { fail: jest.fn() };
    });
    const selectEl = makeEl();

    ui.fetchStatusDevices('Plug Mini (JP)', selectEl, null);

    expect(selectEl.append).toHaveBeenCalledTimes(1);
  });

  it('selectedId がある場合は全オプション追加後に val を設定する', () => {
    global.$.getJSON = jest.fn().mockImplementation((_url, cb) => {
      cb({ deviceList: [{ deviceType: 'Bot', deviceId: 'bot-1', deviceName: 'Bot1' }] });
      return { fail: jest.fn() };
    });
    const selectEl = makeEl();

    ui.fetchStatusDevices('Bot', selectEl, 'bot-1');

    expect(selectEl.val).toHaveBeenCalledWith('bot-1');
  });

  it('selectedId が null の場合は val を設定しない', () => {
    global.$.getJSON = jest.fn().mockImplementation((_url, cb) => {
      cb({ deviceList: [] });
      return { fail: jest.fn() };
    });
    const selectEl = makeEl();

    ui.fetchStatusDevices('Bot', selectEl, null);

    expect(selectEl.val).not.toHaveBeenCalled();
  });
});
