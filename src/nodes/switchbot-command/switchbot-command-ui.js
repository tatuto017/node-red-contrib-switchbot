/**
 * switchbot-command 編集画面のUI関数群
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
    root.SWITCHBOT_COMMAND_DEVICE_TYPES = exports.SWITCHBOT_COMMAND_DEVICE_TYPES;
    root.fetchDevices = exports.fetchDevices;
    root.renderOperationUI = exports.renderOperationUI;
    root.renderSwitchUI = exports.renderSwitchUI;
    root.renderCeilingLightUI = exports.renderCeilingLightUI;
    root.renderCeilingLightSubUI = exports.renderCeilingLightSubUI;
    root.renderAirConditionerUI = exports.renderAirConditionerUI;
    root.renderAirConditionerSubUI = exports.renderAirConditionerSubUI;
  }
})(/* istanbul ignore next */ typeof window !== 'undefined' ? window : this, function () {

  /**
   * デバイスタイプごとのコマンド定義
   */
  const SWITCHBOT_COMMAND_DEVICE_TYPES = [
    { value: 'Plug Mini (JP)', label: 'スマートプラグ' },
    { value: 'Bot', label: 'Bot' },
    { value: 'Ceiling Light', label: 'シーリングライト' },
    { value: 'Humidifier2', label: '除湿機' },
    { value: 'Air Purifier Table VOC', label: '空気清浄機' },
    { value: 'Air Conditioner', label: 'エアコン' },
  ];

  /**
   * SwitchBot APIからデバイス一覧を取得し、選択したタイプで絞り込んでプルダウンに反映する
   * @param {string} deviceType - 絞り込むデバイスタイプ
   * @param {jQuery} selectEl - デバイスプルダウン要素
   * @param {string|null} selectedId - 初期選択するデバイスID
   * @param {Function} callback - 完了後に呼ぶコールバック
   */
  function fetchDevices(deviceType, selectEl, selectedId, callback) {
    const configNodeId = $('#node-input-config').val();
    if (!configNodeId) {
      if (callback) callback();
      return;
    }

    // infraredRemoteList も含めて Air Conditioner を対象にする
    const endpoint = deviceType === 'Air Conditioner'
      ? 'switchbot/devices?configId=' + configNodeId + '&includeInfrared=true'
      : 'switchbot/devices?configId=' + configNodeId;

    $.getJSON(endpoint, function (data) {
      selectEl.empty();
      if (!data) { if (callback) callback(); return; }

      let list = [];
      if (deviceType === 'Air Conditioner' && data.infraredRemoteList) {
        list = data.infraredRemoteList.filter(function (d) { return d.remoteType === 'Air Conditioner'; });
      } else if (data.deviceList) {
        // Ceiling Light 選択時は Ceiling Light Pro も含めて絞り込む
        list = data.deviceList.filter(function (d) {
          if (deviceType === 'Ceiling Light') {
            return d.deviceType === 'Ceiling Light' || d.deviceType === 'Ceiling Light Pro';
          }
          return d.deviceType === deviceType;
        });
      }

      list.forEach(function (d) {
        selectEl.append($('<option>').val(d.deviceId).text(d.deviceName));
      });
      // 全オプション追加後に選択済みデバイスを再選択する
      if (selectedId) selectEl.val(selectedId);

      if (callback) callback();
    }).fail(function () {
      if (callback) callback();
    });
  }

  /**
   * デバイスタイプに応じた操作UIを描画する
   * @param {string} deviceType - デバイスタイプ
   * @param {jQuery} container - 描画先コンテナ
   * @param {object} node - 現在のノードインスタンス（保存済み値の復元に使用）
   */
  function renderOperationUI(deviceType, container, node) {
    container.empty();

    if (deviceType === 'Ceiling Light') {
      renderCeilingLightUI(container, node);
    } else if (deviceType === 'Air Conditioner') {
      renderAirConditionerUI(container, node);
    } else if (deviceType === 'Bot') {
      renderSwitchUI(container, [{ value: 'turnOn', label: 'ON' }], node);
    } else {
      // Plug Mini (JP) / Humidifier2 / Air Purifier Table VOC
      renderSwitchUI(container, [
        { value: 'turnOn', label: 'ON' },
        { value: 'turnOff', label: 'OFF' },
      ], node);
    }
  }

  /**
   * ON/OFF スイッチのUIを描画する
   * @param {jQuery} container - 描画先コンテナ
   * @param {Array<{value: string, label: string}>} options - 選択肢
   * @param {object} node - 現在のノードインスタンス（保存済み値の復元に使用）
   */
  function renderSwitchUI(container, options, node) {
    const row = $('<div class="form-row">');
    row.append($('<label>').text('スイッチ'));
    const sel = $('<select id="switchbot-command-sub-command">');
    options.forEach(function (o) {
      sel.append($('<option>').val(o.value).text(o.label));
    });
    // 全オプション追加後に選択済みの値を設定する
    if (node.command) sel.val(node.command);
    row.append(sel);
    container.append(row);
  }

  /**
   * Ceiling Light / Ceiling Light Pro の操作UIを描画する
   * コマンド選択に応じてサブUIを切り替える
   * @param {jQuery} container - 描画先コンテナ
   * @param {object} node - 現在のノードインスタンス（保存済み値の復元に使用）
   */
  function renderCeilingLightUI(container, node) {
    const commandOptions = [
      { value: 'switch', label: 'スイッチ' },
      { value: 'setBrightness', label: '明るさ' },
      { value: 'setColorTemperature', label: '色温度' },
    ];

    // コマンド選択プルダウン
    // 保存値が turnOn/turnOff なら "switch" グループとして扱う
    let initialCmd = node.command;
    if (initialCmd === 'turnOn' || initialCmd === 'turnOff') initialCmd = 'switch';

    const cmdRow = $('<div class="form-row">');
    cmdRow.append($('<label>').text('コマンド'));
    const cmdSel = $('<select id="switchbot-command-command">');
    commandOptions.forEach(function (o) {
      cmdSel.append($('<option>').val(o.value).text(o.label));
    });
    // 全オプション追加後に選択済みの値を設定する
    cmdSel.val(initialCmd || 'switch');
    cmdRow.append(cmdSel);
    container.append(cmdRow);

    const subArea = $('<div id="switchbot-command-sub">');
    container.append(subArea);

    // コマンド変更時にサブUIを切り替える
    cmdSel.on('change', function () {
      renderCeilingLightSubUI(subArea, String($(this).val()), node);
    });
    renderCeilingLightSubUI(subArea, initialCmd || 'switch', node);
  }

  /**
   * Ceiling Light のサブUI（スイッチ/明るさ/色温度）を描画する
   * @param {jQuery} container - 描画先コンテナ
   * @param {string} cmd - 選択中のコマンド（'switch'/'setBrightness'/'setColorTemperature'）
   * @param {object} node - 現在のノードインスタンス（保存済み値の復元に使用）
   */
  function renderCeilingLightSubUI(container, cmd, node) {
    container.empty();
    if (cmd === 'switch') {
      const options = [
        { value: 'turnOn', label: 'ON' },
        { value: 'turnOff', label: 'OFF' },
      ];
      const row = $('<div class="form-row">');
      row.append($('<label>').text('スイッチ'));
      // 外側のコマンドセレクトと ID が重複しないよう switchbot-command-sub-command を使用する
      const sel = $('<select id="switchbot-command-sub-command">');
      options.forEach(function (o) {
        sel.append($('<option>').val(o.value).text(o.label));
      });
      // 全オプション追加後に選択済みの値を設定する
      if (node.command === 'turnOn' || node.command === 'turnOff') sel.val(node.command);
      row.append(sel);
      container.append(row);
    } else if (cmd === 'setBrightness') {
      const row = $('<div class="form-row">');
      row.append($('<label>').text('明るさ (1-100)'));
      const input = $('<input id="switchbot-command-param-value" type="number" min="1" max="100">').val(
        node.command === 'setBrightness' ? node.parameter || '' : ''
      );
      row.append(input);
      container.append(row);
    } else if (cmd === 'setColorTemperature') {
      const row = $('<div class="form-row">');
      row.append($('<label>').text('色温度 (2700-6500)'));
      const input = $('<input id="switchbot-command-param-value" type="number" min="2700" max="6500">').val(
        node.command === 'setColorTemperature' ? node.parameter || '' : ''
      );
      row.append(input);
      container.append(row);
    }
  }

  /**
   * Air Conditioner の操作UIを描画する
   * @param {jQuery} container - 描画先コンテナ
   * @param {object} node - 現在のノードインスタンス（保存済み値の復元に使用）
   */
  function renderAirConditionerUI(container, node) {
    const commandOptions = [
      { value: 'switch', label: 'スイッチ' },
      { value: 'setAll', label: '空調' },
    ];

    let initialCmd = node.command;
    if (initialCmd === 'turnOn' || initialCmd === 'turnOff') initialCmd = 'switch';
    if (initialCmd === 'setAll') initialCmd = 'setAll';

    const cmdRow = $('<div class="form-row">');
    cmdRow.append($('<label>').text('コマンド'));
    const cmdSel = $('<select id="switchbot-command-command">');
    commandOptions.forEach(function (o) {
      cmdSel.append($('<option>').val(o.value).text(o.label));
    });
    // 全オプション追加後に選択済みの値を設定する
    cmdSel.val(initialCmd || 'switch');
    cmdRow.append(cmdSel);
    container.append(cmdRow);

    const subArea = $('<div id="switchbot-command-sub">');
    container.append(subArea);

    cmdSel.on('change', function () {
      renderAirConditionerSubUI(subArea, String($(this).val()), node);
    });
    renderAirConditionerSubUI(subArea, initialCmd || 'switch', node);
  }

  /**
   * Air Conditioner のサブUI（スイッチ/空調）を描画する
   * @param {jQuery} container - 描画先コンテナ
   * @param {string} cmd - 選択中のコマンド（'switch'/'setAll'）
   * @param {object} node - 現在のノードインスタンス（保存済み値の復元に使用）
   */
  function renderAirConditionerSubUI(container, cmd, node) {
    container.empty();
    if (cmd === 'switch') {
      const options = [
        { value: 'turnOn', label: 'ON' },
        { value: 'turnOff', label: 'OFF' },
      ];
      const row = $('<div class="form-row">');
      row.append($('<label>').text('スイッチ'));
      const sel = $('<select id="switchbot-command-sub-command">');
      options.forEach(function (o) {
        sel.append($('<option>').val(o.value).text(o.label));
      });
      // 全オプション追加後に選択済みの値を設定する
      if (node.command) sel.val(node.command);
      row.append(sel);
      container.append(row);
    } else if (cmd === 'setAll') {
      // 保存済みパラメータを分解する: "{temperature},{mode},{fan_speed},on"
      const parts = (node.parameter || '').split(',');
      const savedTemp = parts[0] || '';
      const savedMode = parts[1] || '1';
      const savedFan = parts[2] || '1';

      // 設定気温
      const tempRow = $('<div class="form-row">');
      tempRow.append($('<label>').text('設定気温'));
      tempRow.append($('<input id="switchbot-ac-temperature" type="number">').val(savedTemp));
      container.append(tempRow);

      // モード
      const modeOptions = [
        { value: '1', label: '自動' },
        { value: '2', label: '冷房' },
        { value: '3', label: '除湿' },
        { value: '4', label: '送風' },
        { value: '5', label: '暖房' },
      ];
      const modeRow = $('<div class="form-row">');
      modeRow.append($('<label>').text('モード'));
      const modeSel = $('<select id="switchbot-ac-mode">');
      modeOptions.forEach(function (o) {
        modeSel.append($('<option>').val(o.value).text(o.label));
      });
      modeSel.val(savedMode);
      modeRow.append(modeSel);
      container.append(modeRow);

      // 風量
      const fanOptions = [
        { value: '1', label: '自動' },
        { value: '2', label: '弱風' },
        { value: '3', label: '標準' },
        { value: '4', label: '強風' },
      ];
      const fanRow = $('<div class="form-row">');
      fanRow.append($('<label>').text('風量'));
      const fanSel = $('<select id="switchbot-ac-fan">');
      fanOptions.forEach(function (o) {
        fanSel.append($('<option>').val(o.value).text(o.label));
      });
      fanSel.val(savedFan);
      fanRow.append(fanSel);
      container.append(fanRow);
    }
  }

  return {
    SWITCHBOT_COMMAND_DEVICE_TYPES,
    fetchDevices,
    renderOperationUI,
    renderSwitchUI,
    renderCeilingLightUI,
    renderCeilingLightSubUI,
    renderAirConditionerUI,
    renderAirConditionerSubUI,
  };
});
