/**
 * switchbot-status 編集画面のUI関数群
 *
 * Node-REDの編集画面（ブラウザ）とユニットテスト（Node.js）の両方で使用できるよう
 * UMD（Universal Module Definition）形式で実装する。
 * ブラウザ環境では各関数をグローバルスコープに公開し、
 * Node.js環境では module.exports としてエクスポートする。
 */
(function (root, factory) {
  /* istanbul ignore else */
  if (typeof module !== 'undefined' && module.exports) {
    // Node.js（テスト環境）
    module.exports = factory();
  } else {
    // ブラウザ（Node-RED編集画面）: 関数をグローバルスコープに公開する
    const exports = factory();
    root.SWITCHBOT_STATUS_DEVICE_TYPE_LABELS = exports.SWITCHBOT_STATUS_DEVICE_TYPE_LABELS;
    root.SWITCHBOT_STATUS_SUPPORTED_TYPES = exports.SWITCHBOT_STATUS_SUPPORTED_TYPES;
    root.fetchStatusDeviceTypes = exports.fetchStatusDeviceTypes;
    root.fetchStatusDevices = exports.fetchStatusDevices;
  }
})(/* istanbul ignore next */ typeof window !== 'undefined' ? window : this, function () {

  /**
   * デバイスタイプの表示名マッピング
   * Ceiling Light と Ceiling Light Pro は「シーリングライト」として統合して扱う
   * Meter と MeterPro(CO2) は「温湿度計」として統合して扱う
   */
  const SWITCHBOT_STATUS_DEVICE_TYPE_LABELS = {
    'Plug Mini (JP)': 'スマートプラグ',
    'Bot': 'Bot',
    'Ceiling Light': 'シーリングライト',
    'Ceiling Light Pro': 'シーリングライト',
    'Humidifier2': '除湿機',
    'Air Purifier Table VOC': '空気清浄機',
    'Meter': '温湿度計',
    'MeterPro(CO2)': '温湿度計',
    'Video Doorbell': 'ドアホン',
  };

  /**
   * 表示対象のデバイスタイプ順序
   * Ceiling Light Pro は Ceiling Light に、MeterPro(CO2) は Meter に統合
   */
  const SWITCHBOT_STATUS_SUPPORTED_TYPES = [
    'Plug Mini (JP)',
    'Bot',
    'Ceiling Light',
    'Humidifier2',
    'Air Purifier Table VOC',
    'Meter',
    'Video Doorbell',
  ];

  /**
   * SwitchBot APIからデバイスタイプ一覧を取得してプルダウンを構築し、デバイス一覧も取得する
   * @param {jQuery} typeSelectEl - デバイスタイププルダウン要素
   * @param {string|null} selectedType - 初期選択するデバイスタイプ
   * @param {jQuery} deviceSelectEl - デバイスプルダウン要素
   * @param {string|null} selectedDeviceId - 初期選択するデバイスID
   */
  function fetchStatusDeviceTypes(typeSelectEl, selectedType, deviceSelectEl, selectedDeviceId) {
    const configNodeId = $('#node-input-config').val();
    if (!configNodeId) return;

    $.getJSON('switchbot/device-types?configId=' + configNodeId, function (deviceTypes) {
      typeSelectEl.empty();

      // 取得したデバイスタイプを正規化する（Ceiling Light Pro → Ceiling Light、MeterPro(CO2) → Meter）
      const normalized = deviceTypes.map(function (t) {
        if (t === 'Ceiling Light Pro') return 'Ceiling Light';
        if (t === 'MeterPro(CO2)') return 'Meter';
        return t;
      });
      const uniqueTypes = normalized.filter(function (t, i, arr) {
        return arr.indexOf(t) === i;
      });

      // サポート対象かつ実際に存在するデバイスタイプのみ表示する
      SWITCHBOT_STATUS_SUPPORTED_TYPES.forEach(function (type) {
        if (uniqueTypes.indexOf(type) !== -1) {
          const label = SWITCHBOT_STATUS_DEVICE_TYPE_LABELS[type];
          typeSelectEl.append($('<option>').val(type).text(label));
        }
      });

      // 保存済みのデバイスタイプを復元する
      if (selectedType) {
        typeSelectEl.val(selectedType);
      }

      // 選択中のデバイスタイプに応じてデバイス一覧を取得する
      const currentType = String(typeSelectEl.val());
      if (currentType) {
        fetchStatusDevices(currentType, deviceSelectEl, selectedDeviceId);
      }
    });
  }

  /**
   * SwitchBot APIからデバイス一覧を取得し、選択したタイプで絞り込んでプルダウンに反映する
   * @param {string} deviceType - 絞り込むデバイスタイプ
   * @param {jQuery} selectEl - デバイスプルダウン要素
   * @param {string|null} selectedId - 初期選択するデバイスID
   */
  function fetchStatusDevices(deviceType, selectEl, selectedId) {
    const configNodeId = $('#node-input-config').val();
    if (!configNodeId) return;

    $.getJSON('switchbot/devices?configId=' + configNodeId, function (data) {
      selectEl.empty();
      if (!data || !data.deviceList) return;
      data.deviceList
        // Ceiling Light 選択時は Ceiling Light Pro も、Meter 選択時は MeterPro(CO2) も含めて絞り込む
        .filter(function (d) {
          if (deviceType === 'Ceiling Light') {
            return d.deviceType === 'Ceiling Light' || d.deviceType === 'Ceiling Light Pro';
          }
          if (deviceType === 'Meter') {
            return d.deviceType === 'Meter' || d.deviceType === 'MeterPro(CO2)';
          }
          return d.deviceType === deviceType;
        })
        .forEach(function (d) {
          selectEl.append($('<option>').val(d.deviceId).text(d.deviceName));
        });
      // 全オプション追加後に選択済みデバイスを再選択する
      if (selectedId) selectEl.val(selectedId);
    });
  }

  return {
    SWITCHBOT_STATUS_DEVICE_TYPE_LABELS,
    SWITCHBOT_STATUS_SUPPORTED_TYPES,
    fetchStatusDeviceTypes,
    fetchStatusDevices,
  };
});
