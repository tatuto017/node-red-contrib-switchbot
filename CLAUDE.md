# プロジェクト概要

SwitchBot APIを使用した Node-RED のノードパッケージ。TypeScript で実装する。
Node-RED での動作確認は別端末で実施するので、別途指示があればパッケージングを行う。

## ノード一覧

| ノード名 | 説明 |
| -------- | ---- |
| `switchbot-config` | SwitchBot APIのトークンを保持する設定ノード |
| `switchbot-status` | 指定デバイスのステータスを取得するノード |
| `switchbot-command` | 指定デバイスにコマンドを送信するノード |

## ディレクトリ構成

```text
src/
├── switchbot/              # SwitchBot APIクライアント
│   ├── fetchHttpClient.ts  # HTTPクライアント実装
│   ├── switchbot.ts        # SwitchBotクラス
│   └── types.ts            # 型定義
├── nodes/
│   ├── switchbot-config/   # 設定ノード
│   ├── switchbot-status/   # ステータス取得ノード
│   └── switchbot-command/  # コマンド送信ノード
└── scripts/
    └── list-device-types.ts  # デバイスタイプ一覧表示スクリプト

docs/    # 仕様書（docs/README.md を参照）
dist/    # ビルド成果物（git管理外）
```

## 利用可能なコマンド

| コマンド | 内容 |
| -------- | ---- |
| `npm run build` | TypeScript をコンパイルし HTML もコピーする |
| `npm test` | テストを実行する |
| `npm run test:coverage` | カバレッジ付きテストを実行する |
| `npm run list-device-types` | デバイスタイプ一覧をコンソールに表示する |

## 環境構築

- TypeScript を使用する
- Node-RED の型定義は `@types/node-red` を使用する
- ユニットテストは jest を使用する

## 開発手法

- SwitchBot API のトークン情報は claude-code に読み込ませない方法で使用する
- SwitchBot API との直接の処理は `SwitchBot` クラスを作成し、`SwitchBot` を通して行う

## コーディング規約

- メソッド名、変数名はキャメルケース（例: `userName`、`myFunction()`）
- 認証情報はソースコードに直接記載しない
- クラスのメソッドはアロー関数で実装
- DI で実装する
- Doc コメントを必ず記載する
- 処理の内容が分かるように、適宜コメントを記載する

## ユニットテスト

- カバレッジ 100% を目指す
- テスト対象のメソッド内部から呼び出している処理は全てモック化する
- モック化した処理の引数、呼び出し回数のテストもする
