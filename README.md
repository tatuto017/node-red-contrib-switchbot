# node-red-contrib-switchbot

SwitchBot API v1.1 を使用した Node-RED カスタムノードパッケージです。  
SwitchBot デバイスへのコマンド送信とステータス取得を Node-RED フローから行えます。

---

## ノード一覧

### switchbot-config（設定ノード）

SwitchBot API の認証情報（Token / Secret）を保持する設定ノードです。  
他のノードから共通の接続設定として参照します。

**設定項目**

| 項目 | 説明 |
|------|------|
| Token | SwitchBot API トークン |
| Secret | SwitchBot API クライアントシークレット |

> 認証情報の取得方法: SwitchBot アプリ → プロフィール → 設定 → アプリバージョンを10回タップ → トークン / クライアントシークレット

---

### switchbot-command（コマンド送信ノード）

指定したデバイスにコマンドを送信します。  
Inject ノードなどからトリガーすると、SwitchBot API 経由でデバイスを操作します。

**対応デバイス**

| デバイスタイプ |
|---------------|
| Plug Mini (JP) |
| Bot |
| Ceiling Light（Ceiling Light Pro を含む） |
| Humidifier2 |
| Air Purifier Table VOC |
| Air Conditioner（赤外線リモコン） |

**出力 `msg`**

| プロパティ | 内容 |
|-----------|------|
| `msg.payload` | API レスポンスの `body` |
| `msg.command` | 送信したコマンドオブジェクト |

---

### switchbot-status（ステータス取得ノード）

指定したデバイスの現在のステータスを取得します。  
Inject ノードなどからトリガーすると、SwitchBot API からデバイス情報を取得して出力します。

**対応デバイス**

| デバイスタイプ | 取得できる主なステータス |
|---------------|------------------------|
| Plug Mini (JP) | 電源状態、電圧、消費電力、電流 |
| Bot | 電源状態、バッテリー残量 |
| Ceiling Light（Ceiling Light Pro を含む） | 電源状態、輝度、色温度 |
| Humidifier2 | 電源状態、モード、湿度 |
| Air Purifier Table VOC | 電源状態、モード、PM2.5 |
| Meter（MeterPro(CO2) を含む） | 温度、湿度（CO2濃度） |
| Video Doorbell | バッテリー残量、オンライン状態 |

**出力 `msg`**

| プロパティ | 内容 |
|-----------|------|
| `msg.payload` | API レスポンスの `body`（デバイスステータス） |

---

## インストール

### Node-RED パレットマネージャーから

Node-RED の「パレットの管理」から `node-red-contrib-switchbot` を検索してインストールします。

### npm から

```bash
cd ~/.node-red
npm install node-red-contrib-switchbot
```

---

## セットアップ

1. Node-RED を起動し、フローエディタを開く
2. `switchbot-config` ノードをフローに追加し、Token と Secret を設定する
3. `switchbot-command` または `switchbot-status` ノードを追加し、設定ノードを選択する
4. デバイスタイプとデバイスを選択してデプロイする

---

## プロジェクト構成

```
node-red-contrib-switchbot/
├── src/
│   ├── nodes/
│   │   ├── switchbot-config/
│   │   │   ├── switchbot-config.ts       # 設定ノード本体
│   │   │   ├── switchbot-config.html     # 編集UI
│   │   │   └── switchbot-config.test.ts  # ユニットテスト
│   │   ├── switchbot-command/
│   │   │   ├── switchbot-command.ts      # コマンド送信ノード本体
│   │   │   ├── switchbot-command.html    # 編集UI
│   │   │   ├── switchbot-command-ui.js   # 編集UI用スクリプト
│   │   │   ├── switchbot-command.test.ts
│   │   │   └── switchbot-command-ui.test.js
│   │   └── switchbot-status/
│   │       ├── switchbot-status.ts       # ステータス取得ノード本体
│   │       ├── switchbot-status.html     # 編集UI
│   │       ├── switchbot-status-ui.js    # 編集UI用スクリプト
│   │       ├── switchbot-status.test.ts
│   │       └── switchbot-status-ui.test.js
│   ├── switchbot/
│   │   ├── switchbot.ts                  # SwitchBot API クライアントクラス
│   │   ├── fetchHttpClient.ts            # fetch ベースの HTTP クライアント
│   │   ├── types.ts                      # 型定義
│   │   ├── switchbot.test.ts
│   │   └── fetchHttpClient.test.ts
│   └── scripts/
│       └── list-device-types.ts          # デバイスタイプ一覧表示スクリプト（開発用）
├── scripts/                              # 手動実行用スクリプト（開発用）
│   ├── getDevices.ts
│   ├── getAllDeviceStatuses.ts
│   └── getScenes.ts
├── docs/                                 # 仕様書
│   ├── spec-switchbot.md
│   ├── spec-switchbot-config-node.md
│   ├── spec-switchbot-command.md
│   ├── spec-switchbot-status.md
│   └── unit-test-spec.md
├── package.json
└── tsconfig.json
```

---

## 開発

### 必要環境

- Node.js 18 以上
- TypeScript 5.x
- Node-RED 3.x

### セットアップ

```bash
npm install
```

### ビルド

```bash
npm run build
```

`src/` 以下の TypeScript ファイルを `dist/` にコンパイルします。

### テスト

```bash
npm test
```

カバレッジレポートを出力する場合:

```bash
npm run test:coverage
```

### 開発用スクリプト

`.env` ファイルに認証情報を設定した上で実行できます。

```bash
cp .env.example .env
# .env に SWITCHBOT_TOKEN と SWITCHBOT_SECRET を設定する
```

接続デバイスのタイプ一覧を確認する:

```bash
npm run list-device-types
```

---

## アーキテクチャ

```
Node-RED ノード
  └── SwitchBot クラス（src/switchbot/switchbot.ts）
        └── HttpClient インターフェース（DI）
              └── fetchHttpClient（src/switchbot/fetchHttpClient.ts）
                    └── SwitchBot API v1.1
```

- `SwitchBot` クラスが API との通信を集約し、ノードから直接 HTTP リクエストを行わない設計にしています
- `HttpClient` をコンストラクタインジェクションで受け取るため、ユニットテストでモック化が容易です

---

## ライセンス

MIT
