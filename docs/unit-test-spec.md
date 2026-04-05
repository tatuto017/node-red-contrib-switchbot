# ユニットテスト仕様書

node-red-contrib-switchbot  
作成日: 2026-04-05

---

## 目次

1. [fetchHttpClient](#1-fetchhttpclient)
2. [SwitchBot](#2-switchbot)
3. [switchbot-config ノード](#3-switchbot-config-ノード)
4. [switchbot-command ノード](#4-switchbot-command-ノード)
5. [switchbot-command UI](#5-switchbot-command-ui)
6. [switchbot-status ノード](#6-switchbot-status-ノード)
7. [switchbot-status UI](#7-switchbot-status-ui)

---

## 1. fetchHttpClient

### 対象ファイル

| 種別 | パス |
|------|------|
| テスト対象 | `src/switchbot/fetchHttpClient.ts` |
| テストファイル | `src/switchbot/fetchHttpClient.test.ts` |

### モック方針

| モック対象 | モック内容 |
|-----------|-----------|
| `fetch` | グローバルの `fetch` を `jest.fn()` で差し替え、`json()` を持つオブジェクトを返す |

---

### テストケース

#### describe: `get`

##### `指定した URL と headers で GET リクエストを送信し、レスポンスの JSON を返す`

| 項目 | 内容 |
|------|------|
| 前提条件 | `fetch` が `{ json: () => mockResponse }` を返す |
| 操作 | `client.get(url, headers)` を呼び出す |
| 検証 | `fetch` が1回呼ばれる |
| 検証 | `method: 'GET'`・指定 URL・指定 headers で呼ばれる |
| 検証 | `json()` のパース結果が返る |

---

#### describe: `post`

##### `指定した URL・headers・body で POST リクエストを送信し、レスポンスの JSON を返す`

| 項目 | 内容 |
|------|------|
| 前提条件 | `fetch` が `{ json: () => mockResponse }` を返す |
| 操作 | `client.post(url, headers, body)` を呼び出す |
| 検証 | `fetch` が1回呼ばれる |
| 検証 | `method: 'POST'`・指定 URL・指定 headers・`JSON.stringify(body)` で呼ばれる |
| 検証 | `json()` のパース結果が返る |

---

## 2. SwitchBot

### 対象ファイル

| 種別 | パス |
|------|------|
| テスト対象 | `src/switchbot/switchbot.ts` |
| テストファイル | `src/switchbot/switchbot.test.ts` |

### モック方針

| モック対象 | モック内容 |
|-----------|-----------|
| `HttpClient` | `get` / `post` を `jest.fn()` で差し替える |
| `crypto.randomUUID` | モック不要（テスト内でキャプチャした値で期待値を計算する） |

---

### テストケース

#### describe: `buildHeaders`

##### `正しい認証ヘッダーを生成する`

| 項目 | 内容 |
|------|------|
| 前提条件 | `httpClient.get` はレスポンスを返す |
| 操作 | `getDevices()` を呼び出し、`httpClient.get` に渡されたヘッダーをキャプチャする |
| 検証 | `headers.Authorization` が token と一致する |
| 検証 | `headers.t`（タイムスタンプ）が truthy である |
| 検証 | `headers.nonce` が truthy である |
| 検証 | `headers.sign` が truthy である |
| 検証 | `headers['Content-Type']` が `'application/json'` である |

##### `sign が HMAC-SHA256 で正しく計算される`

| 項目 | 内容 |
|------|------|
| 前提条件 | `httpClient.get` はレスポンスを返す |
| 操作 | `getDevices()` を呼び出し、ヘッダーをキャプチャする |
| 検証 | キャプチャした `t` と `nonce` を使って `HMAC-SHA256(secret, token + t + nonce)` を計算し、`headers.sign` と一致する |

---

#### describe: `getDevices`

##### `デバイス一覧を取得する`

| 項目 | 内容 |
|------|------|
| 前提条件 | `httpClient.get` が `DeviceListResponse` を返す |
| 操作 | `getDevices()` を呼び出す |
| 検証 | 戻り値がモックレスポンスと一致する |
| 検証 | `httpClient.get` が `'https://api.switch-bot.com/v1.1/devices'` と任意のヘッダーで1回呼ばれる |

---

#### describe: `getDeviceStatus`

##### `デバイスの状態を取得する`

| 項目 | 内容 |
|------|------|
| 前提条件 | `httpClient.get` が `DeviceStatusResponse` を返す |
| 操作 | `getDeviceStatus('device-1')` を呼び出す |
| 検証 | 戻り値がモックレスポンスと一致する |
| 検証 | `httpClient.get` が `'https://api.switch-bot.com/v1.1/devices/device-1/status'` と任意のヘッダーで1回呼ばれる |

---

#### describe: `sendCommand`

##### `デバイスにコマンドを送信する`

| 項目 | 内容 |
|------|------|
| 前提条件 | `httpClient.post` が `CommandResponse` を返す |
| 操作 | `sendCommand('device-1', { command: 'turnOn' })` を呼び出す |
| 検証 | 戻り値がモックレスポンスと一致する |
| 検証 | `httpClient.post` が `'https://api.switch-bot.com/v1.1/devices/device-1/commands'`・任意のヘッダー・コマンドボディで1回呼ばれる |

##### `パラメータ付きコマンドを送信する`

| 項目 | 内容 |
|------|------|
| 前提条件 | `httpClient.post` が `CommandResponse` を返す |
| 操作 | `sendCommand('device-1', { command: 'setColorTemperature', parameter: '4000' })` を呼び出す |
| 検証 | 戻り値がモックレスポンスと一致する |
| 検証 | `httpClient.post` がパラメータを含むコマンドボディをそのまま渡して呼ばれる |

---

## 3. switchbot-config ノード

### 対象ファイル

| 種別 | パス |
|------|------|
| テスト対象 | `src/nodes/switchbot-config/switchbot-config.ts` |
| テストファイル | `src/nodes/switchbot-config/switchbot-config.test.ts` |

### モック方針

| モック対象 | モック内容 |
|-----------|-----------|
| `SwitchBot` クラス | `jest.mock` でクラス全体をモック化する |
| `fetchHttpClient` | `jest.mock` で `{ fetchHttpClient: {} }` に差し替える |
| `NodeAPI` | `registerType` / `createNode` / `getNode` / `httpAdmin.get` を `jest.fn()` で差し替える |

---

### テストケース

#### describe: `registerType`

##### `switchbot-config という名前でノードを登録する`

| 項目 | 内容 |
|------|------|
| 操作 | `switchBotConfig(RED)` を呼び出す |
| 検証 | `RED.nodes.registerType` が1回呼ばれる |
| 検証 | 第1引数が `'switchbot-config'`、第2引数が関数である |

---

#### describe: `httpAdmin /switchbot/device-types`

##### `/switchbot/device-types エンドポイントを登録する`

| 項目 | 内容 |
|------|------|
| 操作 | `switchBotConfig(RED)` を呼び出す |
| 検証 | `RED.httpAdmin.get` が `/switchbot/device-types` を第1引数として呼ばれる |

##### `設定ノードが見つからない場合は 404 を返す`

| 項目 | 内容 |
|------|------|
| 前提条件 | `RED.nodes.getNode` が `null` を返す |
| 操作 | ハンドラを呼び出す |
| 検証 | `res.status(404)` が呼ばれる |
| 検証 | `res.json({ error: 'Config node not found' })` が呼ばれる |

##### `デバイス一覧から一意のデバイスタイプを抽出して返す`

| 項目 | 内容 |
|------|------|
| 前提条件 | `SwitchBot.getDevices` が重複するデバイスタイプを含む `deviceList` を返す |
| 操作 | ハンドラを呼び出す |
| 検証 | 重複を除いたデバイスタイプ配列が `res.json` に渡される |

##### `body に deviceList がない場合は空配列を返す`

| 項目 | 内容 |
|------|------|
| 前提条件 | `SwitchBot.getDevices` が `body` に `deviceList` を含まないレスポンスを返す |
| 操作 | ハンドラを呼び出す |
| 検証 | `res.json([])` が呼ばれる |

##### `API エラー時は 500 を返す`

| 項目 | 内容 |
|------|------|
| 前提条件 | `SwitchBot.getDevices` が `Error('API Error')` で reject する |
| 操作 | ハンドラを呼び出す |
| 検証 | `res.status(500)` が呼ばれる |
| 検証 | `res.json({ error: 'Error: API Error' })` が呼ばれる |

---

#### describe: `httpAdmin UI ファイル配信`

##### `4つの httpAdmin.get エンドポイントを登録する`

| 項目 | 内容 |
|------|------|
| 操作 | `switchBotConfig(RED)` を呼び出す |
| 検証 | `RED.httpAdmin.get` が合計4回呼ばれる |

##### `/switchbot/command-ui.js を switchbot-command-ui.js のパスで返す`

| 項目 | 内容 |
|------|------|
| 操作 | `/switchbot/command-ui.js` ハンドラを呼び出す |
| 検証 | `res.sendFile` のパスに `switchbot-command-ui.js` が含まれる |

##### `/switchbot/status-ui.js を switchbot-status-ui.js のパスで返す`

| 項目 | 内容 |
|------|------|
| 操作 | `/switchbot/status-ui.js` ハンドラを呼び出す |
| 検証 | `res.sendFile` のパスに `switchbot-status-ui.js` が含まれる |

---

#### describe: `httpAdmin /switchbot/devices`

##### `/switchbot/devices エンドポイントを登録する`

| 項目 | 内容 |
|------|------|
| 操作 | `switchBotConfig(RED)` を呼び出す |
| 検証 | `RED.httpAdmin.get` が `/switchbot/devices` を第1引数として呼ばれる |

##### `設定ノードが見つからない場合は 404 を返す`

| 項目 | 内容 |
|------|------|
| 前提条件 | `RED.nodes.getNode` が `null` を返す |
| 操作 | ハンドラを `{ query: { configId: 'config-node-1' } }` で呼び出す |
| 検証 | `res.status(404)` が呼ばれる |
| 検証 | `res.json({ error: 'Config node not found' })` が呼ばれる |

##### `デバイス一覧を取得して infraredRemoteList を除いて返す`

| 項目 | 内容 |
|------|------|
| 前提条件 | `SwitchBot.getDevices` が `deviceList` と `infraredRemoteList` を含むレスポンスを返す |
| 操作 | ハンドラを `{ query: { configId: 'config-node-1' } }`（`includeInfrared` なし）で呼び出す |
| 検証 | `SwitchBot` が認証情報で1回初期化される |
| 検証 | `res.json` が `infraredRemoteList` を含まない `{ deviceList: [...] }` で呼ばれる |

##### `includeInfrared=true の場合は infraredRemoteList を含めて返す`

| 項目 | 内容 |
|------|------|
| 前提条件 | `SwitchBot.getDevices` が `deviceList` と `infraredRemoteList` を含むレスポンスを返す |
| 操作 | ハンドラを `{ query: { configId: 'config-node-1', includeInfrared: 'true' } }` で呼び出す |
| 検証 | `res.json` が `{ deviceList: [...], infraredRemoteList: [...] }` で呼ばれる |

##### `API エラー時は 500 を返す`

| 項目 | 内容 |
|------|------|
| 前提条件 | `SwitchBot.getDevices` が `Error('API Error')` で reject する |
| 操作 | ハンドラを `{ query: { configId: 'config-node-1' } }` で呼び出す |
| 検証 | `res.status(500)` が呼ばれる |
| 検証 | `res.json({ error: 'Error: API Error' })` が呼ばれる |

---

#### describe: `ノードコンストラクタ`

##### `token と secret をノードインスタンスに設定する`

| 項目 | 内容 |
|------|------|
| 操作 | `switchBotConfig(RED)` を呼び出し、`{ token: 'my-token', secret: 'my-secret' }` の設定でコンストラクタを実行する |
| 検証 | `RED.nodes.createNode` がノードインスタンスと設定を引数に1回呼ばれる |
| 検証 | `nodeInstance.token` が `'my-token'` である |
| 検証 | `nodeInstance.secret` が `'my-secret'` である |

---

## 4. switchbot-command ノード

### 対象ファイル

| 種別 | パス |
|------|------|
| テスト対象 | `src/nodes/switchbot-command/switchbot-command.ts` |
| テストファイル | `src/nodes/switchbot-command/switchbot-command.test.ts` |

### モック方針

| モック対象 | モック内容 |
|-----------|-----------|
| `SwitchBot` クラス | `jest.mock` でクラス全体をモック化する |
| `fetchHttpClient` | `jest.mock` で `{ fetchHttpClient: {} }` に差し替える |
| `NodeAPI` | `registerType` / `createNode` / `getNode` を `jest.fn()` で差し替える |
| ノードインスタンス | `{ on: jest.fn() }` として生成し、コンストラクタを `call` で実行する |

---

### テストケース

#### describe: `registerType`

##### `switchbot-command という名前でノードを登録する`

| 項目 | 内容 |
|------|------|
| 操作 | `switchBotCommand(RED)` を呼び出す |
| 検証 | `RED.nodes.registerType` が1回呼ばれる |
| 検証 | 第1引数が `'switchbot-command'`、第2引数が関数である |

---

#### describe: `SUPPORTED_DEVICE_TYPES`

##### `対応デバイスタイプが正しく定義されている`

| 項目 | 内容 |
|------|------|
| 検証 | `'Plug Mini (JP)'` が含まれる |
| 検証 | `'Bot'` が含まれる |
| 検証 | `'Ceiling Light'` が含まれる |
| 検証 | `'Humidifier2'` が含まれる |
| 検証 | `'Air Purifier Table VOC'` が含まれる |
| 検証 | `'Air Conditioner'` が含まれる |

##### `Ceiling Light Pro は統合されているため含まれない`

| 項目 | 内容 |
|------|------|
| 検証 | `'Ceiling Light Pro'` が含まれない |

---

#### describe: `buildCommandRequest`

##### `パラメータなしのコマンドリクエストを生成する`

| 項目 | 内容 |
|------|------|
| 操作 | `buildCommandRequest('turnOn')` を呼び出す |
| 検証 | `{ commandType: 'command', command: 'turnOn' }` が返る |

##### `パラメータありのコマンドリクエストを生成する`

| 項目 | 内容 |
|------|------|
| 操作 | `buildCommandRequest('setColorTemperature', '4000')` を呼び出す |
| 検証 | `{ commandType: 'command', command: 'setColorTemperature', parameter: '4000' }` が返る |

##### `parameter が空文字の場合はキーを含めない`

| 項目 | 内容 |
|------|------|
| 操作 | `buildCommandRequest('turnOn', '')` を呼び出す |
| 検証 | `{ commandType: 'command', command: 'turnOn' }` が返る |
| 検証 | `parameter` キーが存在しない |

##### `parameter が undefined の場合はキーを含めない`

| 項目 | 内容 |
|------|------|
| 操作 | `buildCommandRequest('turnOn', undefined)` を呼び出す |
| 検証 | `{ commandType: 'command', command: 'turnOn' }` が返る |
| 検証 | `parameter` キーが存在しない |

---

#### describe: `ノードコンストラクタ`

##### `ノードプロパティを正しく設定する`

| 項目 | 内容 |
|------|------|
| 操作 | `switchBotCommand(RED)` を呼び出し、`command: 'turnOff'` の設定でコンストラクタを実行する |
| 検証 | `RED.nodes.createNode` がノードインスタンスと設定を引数に1回呼ばれる |
| 検証 | `nodeInstance.config` が `'config-node-1'` である |
| 検証 | `nodeInstance.deviceType` が `'Plug Mini (JP)'` である |
| 検証 | `nodeInstance.deviceId` が `'device-1'` である |
| 検証 | `nodeInstance.command` が `'turnOff'` である |

##### `設定ノードから認証情報を取得して SwitchBot を初期化する`

| 項目 | 内容 |
|------|------|
| 前提条件 | `RED.nodes.getNode` が `{ token: 'my-token', secret: 'my-secret' }` を返す |
| 操作 | コンストラクタを `config: 'config-node-1'` の設定で実行する |
| 検証 | `RED.nodes.getNode` が `'config-node-1'` を引数に1回呼ばれる |
| 検証 | `SwitchBot` が `{ token: 'my-token', secret: 'my-secret' }` と任意のオブジェクトで1回初期化される |

##### `input イベントハンドラを登録する`

| 項目 | 内容 |
|------|------|
| 操作 | コンストラクタを実行する |
| 検証 | `nodeInstance.on` が1回呼ばれる |
| 検証 | 第1引数が `'input'`、第2引数が関数である |

---

#### describe: `input イベント`

##### `パラメータなしコマンドを送信して msg.payload にセットする`

| 項目 | 内容 |
|------|------|
| 前提条件 | `SwitchBot.sendCommand` が `CommandResponse`（body に結果オブジェクト）を返す |
| 操作 | `command: 'turnOn'`、`deviceId: 'device-1'` の設定で input ハンドラを `msg = {}`, `send`, `done` で呼び出す |
| 検証 | `mockSendCommand` が `'device-1'` と `{ commandType: 'command', command: 'turnOn' }` を引数に1回呼ばれる |
| 検証 | `msg.payload` がレスポンスの `body` と一致する |
| 検証 | `msg.command` が送信コマンドと一致する |
| 検証 | `send` が `msg` を引数に1回呼ばれる |
| 検証 | `done` が引数なしで1回呼ばれる |

##### `パラメータありコマンドを送信する`

| 項目 | 内容 |
|------|------|
| 前提条件 | `SwitchBot.sendCommand` が `CommandResponse` を返す |
| 操作 | `command: 'setColorTemperature'`、`parameter: '4000'` の設定で input ハンドラを呼び出す |
| 検証 | `mockSendCommand` が `'device-1'` と `{ commandType: 'command', command: 'setColorTemperature', parameter: '4000' }` を引数に1回呼ばれる |

##### `空調コマンド（setAll）をパラメータ付きで送信する`

| 項目 | 内容 |
|------|------|
| 前提条件 | `SwitchBot.sendCommand` が `CommandResponse` を返す |
| 操作 | `deviceType: 'Air Conditioner'`、`command: 'setAll'`、`parameter: '26,2,3,on'` の設定で input ハンドラを呼び出す |
| 検証 | `mockSendCommand` が `'device-1'` と `{ commandType: 'command', command: 'setAll', parameter: '26,2,3,on' }` を引数に1回呼ばれる |

##### `API エラー時に done にエラーを渡す`

| 項目 | 内容 |
|------|------|
| 前提条件 | `SwitchBot.sendCommand` が `Error('API Error')` で reject する |
| 操作 | input ハンドラを `msg = {}`, `send`, `done` で呼び出す |
| 検証 | `send` が呼ばれない |
| 検証 | `done` がエラーオブジェクトを引数に1回呼ばれる |

---

## 5. switchbot-command UI

### 対象ファイル

| 種別 | パス |
|------|------|
| テスト対象 | `src/nodes/switchbot-command/switchbot-command-ui.js` |
| テストファイル | `src/nodes/switchbot-command/switchbot-command-ui.test.js` |

### モック方針

| モック対象 | モック内容 |
|-----------|-----------|
| `global.$` | `jest.fn()` で jQuery 関数をモック化する。`#node-input-config` は `configNodeId` を返す専用要素、それ以外は `makeEl()` で生成した要素を返す |
| jQuery 要素 | `append` / `empty` / `on` / `text` / `val` を `jest.fn()` で差し替え、`val()` はゲッター/セッターとして機能させる |
| `$.getJSON` | 成功時はコールバックにデータを渡す `makeGetJSON(data)`、失敗時は `.fail` ハンドラを呼ぶ `makeGetJSONFail()` でモック化する |

---

### テストケース

#### describe: `SWITCHBOT_COMMAND_DEVICE_TYPES`

##### `6種類のデバイスタイプが定義されている`

| 項目 | 内容 |
|------|------|
| 検証 | `SWITCHBOT_COMMAND_DEVICE_TYPES` の長さが `6` である |

##### `各エントリに value と label がある`

| 項目 | 内容 |
|------|------|
| 検証 | 全エントリに `value` プロパティが存在する |
| 検証 | 全エントリに `label` プロパティが存在する |

---

#### describe: `fetchDevices`

##### `configNodeId が空の場合はコールバックを呼んで終了する`

| 項目 | 内容 |
|------|------|
| 前提条件 | `#node-input-config` の `val()` が `''` を返す |
| 操作 | `fetchDevices('Plug Mini (JP)', selectEl, null, callback)` を呼び出す |
| 検証 | `$.getJSON` が呼ばれない |
| 検証 | `callback` が1回呼ばれる |

##### `configNodeId が空かつコールバックが null の場合はエラーにならない`

| 項目 | 内容 |
|------|------|
| 前提条件 | `#node-input-config` の `val()` が `''` を返す |
| 操作 | `fetchDevices('Plug Mini (JP)', makeEl(), null, null)` を呼び出す |
| 検証 | 例外がスローされない |

##### `Air Conditioner の場合は includeInfrared=true エンドポイントを使用する`

| 項目 | 内容 |
|------|------|
| 前提条件 | `$.getJSON` が `{ infraredRemoteList: [] }` を返す |
| 操作 | `fetchDevices('Air Conditioner', selectEl, null, callback)` を呼び出す |
| 検証 | `$.getJSON` の第1引数 URL に `includeInfrared=true` が含まれる |
| 検証 | `callback` が1回呼ばれる |

##### `Air Conditioner 以外は通常エンドポイントを使用する`

| 項目 | 内容 |
|------|------|
| 前提条件 | `$.getJSON` が `{ deviceList: [] }` を返す |
| 操作 | `fetchDevices('Plug Mini (JP)', selectEl, null, jest.fn())` を呼び出す |
| 検証 | `$.getJSON` の第1引数 URL に `includeInfrared` が含まれない |

##### `Air Conditioner: infraredRemoteList から Air Conditioner タイプのみ絞り込む`

| 項目 | 内容 |
|------|------|
| 前提条件 | `$.getJSON` が `{ infraredRemoteList: [{ remoteType: 'Air Conditioner', ... }, { remoteType: 'TV', ... }] }` を返す |
| 操作 | `fetchDevices('Air Conditioner', selectEl, null, jest.fn())` を呼び出す |
| 検証 | `selectEl.append` が1回（Air Conditioner のみ）呼ばれる |

##### `Air Conditioner で infraredRemoteList がない場合は deviceList を使用する`

| 項目 | 内容 |
|------|------|
| 前提条件 | `$.getJSON` が `{ deviceList: [{ deviceType: 'Air Conditioner', ... }] }` を返す |
| 操作 | `fetchDevices('Air Conditioner', selectEl, null, jest.fn())` を呼び出す |
| 検証 | `selectEl.append` が1回呼ばれる |

##### `deviceList から指定タイプで絞り込む`

| 項目 | 内容 |
|------|------|
| 前提条件 | `$.getJSON` が `{ deviceList: [{ deviceType: 'Plug Mini (JP)', ... }, { deviceType: 'Bot', ... }] }` を返す |
| 操作 | `fetchDevices('Plug Mini (JP)', selectEl, null, jest.fn())` を呼び出す |
| 検証 | `selectEl.append` が1回（Plug Mini (JP) のみ）呼ばれる |

##### `Ceiling Light 選択時は Ceiling Light Pro も含めて絞り込む`

| 項目 | 内容 |
|------|------|
| 前提条件 | `$.getJSON` が `{ deviceList: [{ deviceType: 'Ceiling Light', ... }, { deviceType: 'Ceiling Light Pro', ... }, { deviceType: 'Bot', ... }] }` を返す |
| 操作 | `fetchDevices('Ceiling Light', selectEl, null, jest.fn())` を呼び出す |
| 検証 | `selectEl.append` が2回（Ceiling Light + Ceiling Light Pro）呼ばれる |

##### `deviceList が存在しない場合はデバイスを追加しない`

| 項目 | 内容 |
|------|------|
| 前提条件 | `$.getJSON` が `{}` を返す |
| 操作 | `fetchDevices('Plug Mini (JP)', selectEl, null, callback)` を呼び出す |
| 検証 | `selectEl.append` が呼ばれない |
| 検証 | `callback` が1回呼ばれる |

##### `selectedId がある場合は全オプション追加後に val を設定する`

| 項目 | 内容 |
|------|------|
| 前提条件 | `$.getJSON` が `{ deviceList: [{ deviceType: 'Bot', deviceId: 'bot-1', ... }] }` を返す |
| 操作 | `fetchDevices('Bot', selectEl, 'bot-1', jest.fn())` を呼び出す |
| 検証 | `selectEl.val('bot-1')` が呼ばれる |

##### `selectedId が null の場合は val を設定しない`

| 項目 | 内容 |
|------|------|
| 前提条件 | `$.getJSON` が `{ deviceList: [] }` を返す |
| 操作 | `fetchDevices('Bot', selectEl, null, jest.fn())` を呼び出す |
| 検証 | `selectEl.val` が呼ばれない |

##### `data が null の場合はコールバックを呼んで終了する`

| 項目 | 内容 |
|------|------|
| 前提条件 | `$.getJSON` が `null` をコールバックに渡す |
| 操作 | `fetchDevices('Bot', selectEl, null, callback)` を呼び出す |
| 検証 | `callback` が1回呼ばれる |

##### `data が null かつコールバックが null の場合はエラーにならない`

| 項目 | 内容 |
|------|------|
| 前提条件 | `$.getJSON` が `null` をコールバックに渡す |
| 操作 | `fetchDevices('Bot', makeEl(), null, null)` を呼び出す |
| 検証 | 例外がスローされない |

##### `成功時にコールバックが null でもエラーにならない`

| 項目 | 内容 |
|------|------|
| 前提条件 | `$.getJSON` が `{ deviceList: [] }` を返す |
| 操作 | `fetchDevices('Plug Mini (JP)', makeEl(), null, null)` を呼び出す |
| 検証 | 例外がスローされない |

##### `API エラー時にコールバックを呼ぶ`

| 項目 | 内容 |
|------|------|
| 前提条件 | `$.getJSON` の `.fail` ハンドラが呼ばれる |
| 操作 | `fetchDevices('Bot', selectEl, null, callback)` を呼び出す |
| 検証 | `callback` が1回呼ばれる |

##### `API エラー時にコールバックが null でもエラーにならない`

| 項目 | 内容 |
|------|------|
| 前提条件 | `$.getJSON` の `.fail` ハンドラが呼ばれる |
| 操作 | `fetchDevices('Bot', makeEl(), null, null)` を呼び出す |
| 検証 | 例外がスローされない |

---

#### describe: `renderOperationUI`

##### `Ceiling Light → コマンドセレクトを含む Ceiling Light UI を描画する`

| 項目 | 内容 |
|------|------|
| 操作 | `renderOperationUI('Ceiling Light', container, { command: '' })` を呼び出す |
| 検証 | `switchbot-command-command` を含む要素が生成される |

##### `Air Conditioner → コマンドセレクトを含む Air Conditioner UI を描画する`

| 項目 | 内容 |
|------|------|
| 操作 | `renderOperationUI('Air Conditioner', container, { command: '' })` を呼び出す |
| 検証 | `switchbot-command-command` を含む要素が生成される |

##### `Bot → ON のみのスイッチ UI を描画する`

| 項目 | 内容 |
|------|------|
| 操作 | `renderOperationUI('Bot', container, { command: 'turnOn' })` を呼び出す |
| 検証 | `switchbot-command-sub-command` 要素への `append` が1回呼ばれる |

##### `Plug Mini (JP) → ON/OFF のスイッチ UI を描画する`

| 項目 | 内容 |
|------|------|
| 操作 | `renderOperationUI('Plug Mini (JP)', container, { command: 'turnOn' })` を呼び出す |
| 検証 | `switchbot-command-sub-command` 要素への `append` が2回呼ばれる |

##### `Humidifier2 → ON/OFF のスイッチ UI を描画する`

| 項目 | 内容 |
|------|------|
| 操作 | `renderOperationUI('Humidifier2', container, { command: 'turnOff' })` を呼び出す |
| 検証 | `switchbot-command-sub-command` 要素への `append` が2回呼ばれる |

---

#### describe: `renderSwitchUI`

##### `node.command がある場合は val を設定する`

| 項目 | 内容 |
|------|------|
| 操作 | `renderSwitchUI(container, [{ value: 'turnOn', label: 'ON' }, { value: 'turnOff', label: 'OFF' }], { command: 'turnOff' })` を呼び出す |
| 検証 | `switchbot-command-sub-command` 要素の `val('turnOff')` が呼ばれる |

##### `node.command が空の場合は val を設定しない`

| 項目 | 内容 |
|------|------|
| 操作 | `renderSwitchUI(container, [{ value: 'turnOn', label: 'ON' }], { command: '' })` を呼び出す |
| 検証 | `switchbot-command-sub-command` 要素の `val` が呼ばれない |

---

#### describe: `renderCeilingLightUI`

##### `初期コマンドが turnOn の場合は switch として描画する`

| 項目 | 内容 |
|------|------|
| 操作 | `renderCeilingLightUI(container, { command: 'turnOn' })` を呼び出す |
| 検証 | `switchbot-command-command` 要素の `val('switch')` が呼ばれる |

##### `初期コマンドが turnOff の場合は switch として描画する`

| 項目 | 内容 |
|------|------|
| 操作 | `renderCeilingLightUI(container, { command: 'turnOff' })` を呼び出す |
| 検証 | `switchbot-command-command` 要素の `val('switch')` が呼ばれる |

##### `初期コマンドが setBrightness の場合はそのまま描画する`

| 項目 | 内容 |
|------|------|
| 操作 | `renderCeilingLightUI(container, { command: 'setBrightness', parameter: '50' })` を呼び出す |
| 検証 | `switchbot-command-command` 要素の `val('setBrightness')` が呼ばれる |

##### `初期コマンドが空の場合は switch として描画する（|| switch フォールバック）`

| 項目 | 内容 |
|------|------|
| 操作 | `renderCeilingLightUI(container, { command: '' })` を呼び出す |
| 検証 | `switchbot-command-command` 要素の `val('switch')` が呼ばれる |

##### `コマンド変更時にサブ UI を再描画する`

| 項目 | 内容 |
|------|------|
| 操作 | `renderCeilingLightUI(container, { command: '' })` を呼び出した後、`change` ハンドラを発火させる |
| 検証 | `switchbot-command-sub` 要素の `empty()` が1回呼ばれる |

---

#### describe: `renderCeilingLightSubUI`

##### switch コマンド: `node.command が turnOn の場合は turnOn を選択する`

| 項目 | 内容 |
|------|------|
| 操作 | `renderCeilingLightSubUI(container, 'switch', { command: 'turnOn' })` を呼び出す |
| 検証 | `switchbot-command-sub-command` 要素の `val('turnOn')` が呼ばれる |

##### switch コマンド: `node.command が turnOff の場合は turnOff を選択する`

| 項目 | 内容 |
|------|------|
| 操作 | `renderCeilingLightSubUI(container, 'switch', { command: 'turnOff' })` を呼び出す |
| 検証 | `switchbot-command-sub-command` 要素の `val('turnOff')` が呼ばれる |

##### switch コマンド: `node.command が turnOn/turnOff 以外の場合は val を設定しない`

| 項目 | 内容 |
|------|------|
| 操作 | `renderCeilingLightSubUI(container, 'switch', { command: 'switch' })` を呼び出す |
| 検証 | `switchbot-command-sub-command` 要素の `val` が呼ばれない |

##### setBrightness コマンド: `node.command が setBrightness の場合は保存値を復元する`

| 項目 | 内容 |
|------|------|
| 操作 | `renderCeilingLightSubUI(container, 'setBrightness', { command: 'setBrightness', parameter: '75' })` を呼び出す |
| 検証 | `switchbot-command-param-value` 要素の `val('75')` が呼ばれる |

##### setBrightness コマンド: `node.command が setBrightness でも parameter が未設定の場合は空文字を設定する`

| 項目 | 内容 |
|------|------|
| 操作 | `renderCeilingLightSubUI(container, 'setBrightness', { command: 'setBrightness', parameter: undefined })` を呼び出す |
| 検証 | `switchbot-command-param-value` 要素の `val('')` が呼ばれる |

##### setBrightness コマンド: `node.command が setBrightness でない場合は空文字を設定する`

| 項目 | 内容 |
|------|------|
| 操作 | `renderCeilingLightSubUI(container, 'setBrightness', { command: 'switch', parameter: '' })` を呼び出す |
| 検証 | `switchbot-command-param-value` 要素の `val('')` が呼ばれる |

##### setColorTemperature コマンド: `node.command が setColorTemperature の場合は保存値を復元する`

| 項目 | 内容 |
|------|------|
| 操作 | `renderCeilingLightSubUI(container, 'setColorTemperature', { command: 'setColorTemperature', parameter: '4000' })` を呼び出す |
| 検証 | `switchbot-command-param-value` 要素の `val('4000')` が呼ばれる |

##### setColorTemperature コマンド: `node.command が setColorTemperature でも parameter が未設定の場合は空文字を設定する`

| 項目 | 内容 |
|------|------|
| 操作 | `renderCeilingLightSubUI(container, 'setColorTemperature', { command: 'setColorTemperature', parameter: undefined })` を呼び出す |
| 検証 | `switchbot-command-param-value` 要素の `val('')` が呼ばれる |

##### setColorTemperature コマンド: `node.command が setColorTemperature でない場合は空文字を設定する`

| 項目 | 内容 |
|------|------|
| 操作 | `renderCeilingLightSubUI(container, 'setColorTemperature', { command: 'switch', parameter: '' })` を呼び出す |
| 検証 | `switchbot-command-param-value` 要素の `val('')` が呼ばれる |

##### 共通: `未知のコマンドの場合は container.empty() のみ呼ぶ`

| 項目 | 内容 |
|------|------|
| 操作 | `renderCeilingLightSubUI(container, 'unknown', { command: '' })` を呼び出す |
| 検証 | `container.empty` が1回呼ばれる |
| 検証 | 新しい要素が生成されない（`createdElements` が空） |

---

#### describe: `renderAirConditionerUI`

##### `初期コマンドが turnOn の場合は switch として描画する`

| 項目 | 内容 |
|------|------|
| 操作 | `renderAirConditionerUI(container, { command: 'turnOn' })` を呼び出す |
| 検証 | `switchbot-command-command` 要素の `val('switch')` が呼ばれる |

##### `初期コマンドが turnOff の場合は switch として描画する`

| 項目 | 内容 |
|------|------|
| 操作 | `renderAirConditionerUI(container, { command: 'turnOff' })` を呼び出す |
| 検証 | `switchbot-command-command` 要素の `val('switch')` が呼ばれる |

##### `初期コマンドが setAll の場合は setAll として描画する`

| 項目 | 内容 |
|------|------|
| 操作 | `renderAirConditionerUI(container, { command: 'setAll', parameter: '26,2,3,on' })` を呼び出す |
| 検証 | `switchbot-command-command` 要素の `val('setAll')` が呼ばれる |

##### `初期コマンドが空の場合は switch として描画する（|| switch フォールバック）`

| 項目 | 内容 |
|------|------|
| 操作 | `renderAirConditionerUI(container, { command: '' })` を呼び出す |
| 検証 | `switchbot-command-command` 要素の `val('switch')` が呼ばれる |

##### `コマンド変更時にサブ UI を再描画する`

| 項目 | 内容 |
|------|------|
| 操作 | `renderAirConditionerUI(container, { command: '' })` を呼び出した後、`change` ハンドラを発火させる |
| 検証 | `switchbot-command-sub` 要素の `empty()` が1回呼ばれる |

---

#### describe: `renderAirConditionerSubUI`

##### switch コマンド: `node.command がある場合は val を設定する`

| 項目 | 内容 |
|------|------|
| 操作 | `renderAirConditionerSubUI(container, 'switch', { command: 'turnOff' })` を呼び出す |
| 検証 | `switchbot-command-sub-command` 要素の `val('turnOff')` が呼ばれる |

##### switch コマンド: `node.command が空の場合は val を設定しない`

| 項目 | 内容 |
|------|------|
| 操作 | `renderAirConditionerSubUI(container, 'switch', { command: '' })` を呼び出す |
| 検証 | `switchbot-command-sub-command` 要素の `val` が呼ばれない |

##### setAll コマンド: `保存済みパラメータを分解して各フィールドを復元する`

| 項目 | 内容 |
|------|------|
| 操作 | `renderAirConditionerSubUI(container, 'setAll', { command: 'setAll', parameter: '26,2,3,on' })` を呼び出す |
| 検証 | `switchbot-ac-temperature` 要素の `val('26')` が呼ばれる |
| 検証 | `switchbot-ac-mode` 要素の `val('2')` が呼ばれる |
| 検証 | `switchbot-ac-fan` 要素の `val('3')` が呼ばれる |

##### setAll コマンド: `parameter が空の場合はデフォルト値（モード: 1、風量: 1）を使用する`

| 項目 | 内容 |
|------|------|
| 操作 | `renderAirConditionerSubUI(container, 'setAll', { command: 'setAll', parameter: '' })` を呼び出す |
| 検証 | `switchbot-ac-temperature` 要素の `val('')` が呼ばれる |
| 検証 | `switchbot-ac-mode` 要素の `val('1')` が呼ばれる |
| 検証 | `switchbot-ac-fan` 要素の `val('1')` が呼ばれる |

##### setAll コマンド: `parameter が undefined の場合はデフォルト値を使用する`

| 項目 | 内容 |
|------|------|
| 操作 | `renderAirConditionerSubUI(container, 'setAll', { command: 'setAll', parameter: undefined })` を呼び出す |
| 検証 | `switchbot-ac-mode` 要素の `val('1')` が呼ばれる |
| 検証 | `switchbot-ac-fan` 要素の `val('1')` が呼ばれる |

##### 共通: `未知のコマンドの場合は container.empty() のみ呼ぶ`

| 項目 | 内容 |
|------|------|
| 操作 | `renderAirConditionerSubUI(container, 'unknown', { command: '' })` を呼び出す |
| 検証 | `container.empty` が1回呼ばれる |
| 検証 | 新しい要素が生成されない（`createdElements` が空） |

---

## 6. switchbot-status ノード

### 対象ファイル

| 種別 | パス |
|------|------|
| テスト対象 | `src/nodes/switchbot-status/switchbot-status.ts` |
| テストファイル | `src/nodes/switchbot-status/switchbot-status.test.ts` |

### モック方針

| モック対象 | モック内容 |
|-----------|-----------|
| `SwitchBot` クラス | `jest.mock` でクラス全体をモック化する |
| `fetchHttpClient` | `jest.mock` で `{ fetchHttpClient: {} }` に差し替える |
| `NodeAPI` | `registerType` / `createNode` / `getNode` を `jest.fn()` で差し替える |
| ノードインスタンス | `{ on: jest.fn() }` として生成し、コンストラクタを `call` で実行する |

---

### テストケース

#### describe: `registerType`

##### `switchbot-status という名前でノードを登録する`

| 項目 | 内容 |
|------|------|
| 操作 | `switchBotStatus(RED)` を呼び出す |
| 検証 | `RED.nodes.registerType` が1回呼ばれる |
| 検証 | 第1引数が `'switchbot-status'`、第2引数が関数である |

---

#### describe: `SUPPORTED_DEVICE_TYPES`

##### `対応デバイスタイプが正しく定義されている`

| 項目 | 内容 |
|------|------|
| 検証 | `'Plug Mini (JP)'` が含まれる |
| 検証 | `'Bot'` が含まれる |
| 検証 | `'Ceiling Light'` が含まれる |
| 検証 | `'Humidifier2'` が含まれる |
| 検証 | `'Air Purifier Table VOC'` が含まれる |
| 検証 | `'Meter'` が含まれる |
| 検証 | `'Video Doorbell'` が含まれる |

##### `Ceiling Light Pro は統合されているため含まれない`

| 項目 | 内容 |
|------|------|
| 検証 | `'Ceiling Light Pro'` が含まれない |

##### `MeterPro(CO2) は統合されているため含まれない`

| 項目 | 内容 |
|------|------|
| 検証 | `'MeterPro(CO2)'` が含まれない |

---

#### describe: `ノードコンストラクタ`

##### `ノードプロパティを正しく設定する`

| 項目 | 内容 |
|------|------|
| 操作 | `switchBotStatus(RED)` を呼び出し、`makeConfig()` の設定でコンストラクタを実行する |
| 検証 | `RED.nodes.createNode` がノードインスタンスと設定を引数に1回呼ばれる |
| 検証 | `nodeInstance.config` が `'config-node-1'` である |
| 検証 | `nodeInstance.deviceType` が `'Plug Mini (JP)'` である |
| 検証 | `nodeInstance.deviceId` が `'device-1'` である |

##### `設定ノードから認証情報を取得して SwitchBot を初期化する`

| 項目 | 内容 |
|------|------|
| 前提条件 | `RED.nodes.getNode` が `{ token: 'my-token', secret: 'my-secret' }` を返す |
| 操作 | コンストラクタを `config: 'config-node-1'` の設定で実行する |
| 検証 | `RED.nodes.getNode` が `'config-node-1'` を引数に1回呼ばれる |
| 検証 | `SwitchBot` が `{ token: 'my-token', secret: 'my-secret' }` と任意のオブジェクトで1回初期化される |

##### `input イベントハンドラを登録する`

| 項目 | 内容 |
|------|------|
| 操作 | コンストラクタを実行する |
| 検証 | `nodeInstance.on` が1回呼ばれる |
| 検証 | 第1引数が `'input'`、第2引数が関数である |

---

#### describe: `input イベント`

##### `デバイスのステータスを取得して msg.payload にセットする`

| 項目 | 内容 |
|------|------|
| 前提条件 | `SwitchBot.getDeviceStatus` が `DeviceStatusResponse`（body にステータスオブジェクト）を返す |
| 操作 | input ハンドラを `msg = {}`, `send`, `done` で呼び出す |
| 検証 | `mockGetDeviceStatus` が `'device-1'` を引数に1回呼ばれる |
| 検証 | `msg.payload` がレスポンスの `body` と一致する |
| 検証 | `send` が `msg` を引数に1回呼ばれる |
| 検証 | `done` が引数なしで1回呼ばれる |

##### `API エラー時に done にエラーを渡す`

| 項目 | 内容 |
|------|------|
| 前提条件 | `SwitchBot.getDeviceStatus` が `Error('API Error')` で reject する |
| 操作 | input ハンドラを `msg = {}`, `send`, `done` で呼び出す |
| 検証 | `send` が呼ばれない |
| 検証 | `done` がエラーオブジェクトを引数に1回呼ばれる |

---

## 7. switchbot-status UI

### 対象ファイル

| 種別 | パス |
|------|------|
| テスト対象 | `src/nodes/switchbot-status/switchbot-status-ui.js` |
| テストファイル | `src/nodes/switchbot-status/switchbot-status-ui.test.js` |

### モック方針

| モック対象 | モック内容 |
|-----------|-----------|
| `global.$` | `jest.fn()` で jQuery 関数をモック化する。`#node-input-config` は `configNodeId` を返す専用要素、それ以外は `makeEl()` で生成した要素を返す |
| jQuery 要素 | `append` / `empty` / `on` / `text` / `val` を `jest.fn()` で差し替え、`val()` はゲッター/セッターとして機能させる |
| `$.getJSON` | 成功時はコールバックにデータを渡す `makeGetJSON(data)`、失敗時は `.fail` ハンドラを呼ぶ `makeGetJSONFail()` でモック化する |

---

### テストケース

#### describe: `SWITCHBOT_STATUS_DEVICE_TYPE_LABELS`

##### `全サポートタイプのラベルが定義されている`

| 項目 | 内容 |
|------|------|
| 検証 | `'Plug Mini (JP)'` のラベルが正しい |
| 検証 | `'Bot'` のラベルが正しい |
| 検証 | `'Ceiling Light'` のラベルが正しい |
| 検証 | `'Ceiling Light Pro'` のラベルが正しい |
| 検証 | `'Humidifier2'` のラベルが正しい |
| 検証 | `'Air Purifier Table VOC'` のラベルが正しい |
| 検証 | `'Meter'` のラベルが正しい |
| 検証 | `'MeterPro(CO2)'` のラベルが正しい |
| 検証 | `'Video Doorbell'` のラベルが正しい |

---

#### describe: `SWITCHBOT_STATUS_SUPPORTED_TYPES`

##### `7種類のサポートタイプが定義されている`

| 項目 | 内容 |
|------|------|
| 検証 | 配列の長さが `7` である |

##### `Ceiling Light Pro と MeterPro(CO2) は含まれない（統合済み）`

| 項目 | 内容 |
|------|------|
| 検証 | `'Ceiling Light Pro'` が配列に含まれない |
| 検証 | `'MeterPro(CO2)'` が配列に含まれない |

---

#### describe: `fetchStatusDeviceTypes`

##### `configNodeId が空の場合は何もしない`

| 項目 | 内容 |
|------|------|
| 前提条件 | `#node-input-config` の `val()` が `''` を返す |
| 操作 | `fetchStatusDeviceTypes(typeSelectEl, null, null)` を呼び出す |
| 検証 | `$.getJSON` が呼ばれない |

##### `Ceiling Light Pro を Ceiling Light に正規化する`

| 項目 | 内容 |
|------|------|
| 前提条件 | `$.getJSON` が `['Ceiling Light Pro']` を返す |
| 操作 | `fetchStatusDeviceTypes(typeSelectEl, null, null)` を呼び出す |
| 検証 | 正規化後 `'Ceiling Light'` がオプションとして追加される |

##### `MeterPro(CO2) を Meter に正規化する`

| 項目 | 内容 |
|------|------|
| 前提条件 | `$.getJSON` が `['MeterPro(CO2)']` を返す |
| 操作 | `fetchStatusDeviceTypes(typeSelectEl, null, null)` を呼び出す |
| 検証 | 正規化後 `'Meter'` がオプションとして追加される |

##### `重複するタイプを除外して一意にする`

| 項目 | 内容 |
|------|------|
| 前提条件 | `$.getJSON` が `['Ceiling Light', 'Ceiling Light Pro']` を返す |
| 操作 | `fetchStatusDeviceTypes(typeSelectEl, null, null)` を呼び出す |
| 検証 | 正規化・重複除去により `typeSelectEl.append` が1回呼ばれる |

##### `サポート対象外のタイプは表示しない`

| 項目 | 内容 |
|------|------|
| 前提条件 | `$.getJSON` が `SUPPORTED_TYPES` に含まれないタイプを返す |
| 操作 | `fetchStatusDeviceTypes(typeSelectEl, null, null)` を呼び出す |
| 検証 | `typeSelectEl.append` が呼ばれない |

##### `selectedType がある場合は val を設定する`

| 項目 | 内容 |
|------|------|
| 前提条件 | `$.getJSON` が `['Plug Mini (JP)']` を返す |
| 操作 | `fetchStatusDeviceTypes(typeSelectEl, 'Plug Mini (JP)', null)` を呼び出す |
| 検証 | `typeSelectEl.val('Plug Mini (JP)')` が呼ばれる |

##### `selectedType が null の場合は val を設定しない`

| 項目 | 内容 |
|------|------|
| 前提条件 | `$.getJSON` が `['Plug Mini (JP)']` を返す |
| 操作 | `fetchStatusDeviceTypes(typeSelectEl, null, null)` を呼び出す |
| 検証 | `typeSelectEl.val` が値付きで呼ばれない |

##### `currentType がある場合は fetchStatusDevices を呼ぶ`

| 項目 | 内容 |
|------|------|
| 前提条件 | `$.getJSON` が device-types と devices の両エンドポイントに対してレスポンスを返す |
| 操作 | `fetchStatusDeviceTypes(typeSelectEl, 'Plug Mini (JP)', 'Plug Mini (JP)')` を呼び出す |
| 検証 | `$.getJSON` が device-types と devices の計2回呼ばれる |

##### `currentType が空の場合は fetchStatusDevices を呼ばない`

| 項目 | 内容 |
|------|------|
| 前提条件 | `$.getJSON` が device-types エンドポイントに対してレスポンスを返す |
| 操作 | `fetchStatusDeviceTypes(typeSelectEl, null, null)` を呼び出す |
| 検証 | `$.getJSON` が device-types のみ1回呼ばれる |

---

#### describe: `fetchStatusDevices`

##### `configNodeId が空の場合は何もしない`

| 項目 | 内容 |
|------|------|
| 前提条件 | `#node-input-config` の `val()` が `''` を返す |
| 操作 | `fetchStatusDevices('Plug Mini (JP)', selectEl, null)` を呼び出す |
| 検証 | `$.getJSON` が呼ばれない |

##### `data が null の場合は何もしない`

| 項目 | 内容 |
|------|------|
| 前提条件 | `$.getJSON` が `null` をコールバックに渡す |
| 操作 | `fetchStatusDevices('Plug Mini (JP)', selectEl, null)` を呼び出す |
| 検証 | `selectEl.append` が呼ばれない |

##### `data.deviceList が null の場合は何もしない`

| 項目 | 内容 |
|------|------|
| 前提条件 | `$.getJSON` が `{ deviceList: null }` を返す |
| 操作 | `fetchStatusDevices('Plug Mini (JP)', selectEl, null)` を呼び出す |
| 検証 | `selectEl.append` が呼ばれない |

##### `Ceiling Light 選択時は Ceiling Light Pro も含めて絞り込む`

| 項目 | 内容 |
|------|------|
| 前提条件 | `$.getJSON` が `{ deviceList: [{ deviceType: 'Ceiling Light', ... }, { deviceType: 'Ceiling Light Pro', ... }] }` を返す |
| 操作 | `fetchStatusDevices('Ceiling Light', selectEl, null)` を呼び出す |
| 検証 | `selectEl.append` が2回（Ceiling Light + Ceiling Light Pro）呼ばれる |

##### `Meter 選択時は MeterPro(CO2) も含めて絞り込む`

| 項目 | 内容 |
|------|------|
| 前提条件 | `$.getJSON` が `{ deviceList: [{ deviceType: 'Meter', ... }, { deviceType: 'MeterPro(CO2)', ... }] }` を返す |
| 操作 | `fetchStatusDevices('Meter', selectEl, null)` を呼び出す |
| 検証 | `selectEl.append` が2回（Meter + MeterPro(CO2)）呼ばれる |

##### `その他のタイプは deviceType が一致するもののみ絞り込む`

| 項目 | 内容 |
|------|------|
| 前提条件 | `$.getJSON` が `{ deviceList: [{ deviceType: 'Bot', ... }, { deviceType: 'Plug Mini (JP)', ... }] }` を返す |
| 操作 | `fetchStatusDevices('Bot', selectEl, null)` を呼び出す |
| 検証 | `selectEl.append` が1回（Bot のみ）呼ばれる |

##### `selectedId がある場合は全オプション追加後に val を設定する`

| 項目 | 内容 |
|------|------|
| 前提条件 | `$.getJSON` が `{ deviceList: [{ deviceType: 'Bot', deviceId: 'bot-1', ... }] }` を返す |
| 操作 | `fetchStatusDevices('Bot', selectEl, 'bot-1')` を呼び出す |
| 検証 | `selectEl.val('bot-1')` が呼ばれる |

##### `selectedId が null の場合は val を設定しない`

| 項目 | 内容 |
|------|------|
| 前提条件 | `$.getJSON` が `{ deviceList: [] }` を返す |
| 操作 | `fetchStatusDevices('Bot', selectEl, null)` を呼び出す |
| 検証 | `selectEl.val` が呼ばれない |

---

## テスト集計

| テストファイル | テスト数 |
|-------------|---------|
| fetchHttpClient.test.ts | 2 |
| switchbot.test.ts | 6 |
| switchbot-config.test.ts | 14 |
| switchbot-command.test.ts | 18 |
| switchbot-command-ui.test.js | 48 |
| switchbot-status.test.ts | 11 |
| switchbot-status-ui.test.js | 18 |
| **合計** | **117** |
