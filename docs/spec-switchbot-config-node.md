# ノード仕様書: 設定ノード

## 概要

| 項目 | 内容 |
|------|------|
| ノード名 | `switchbot-config` |
| カテゴリ | `config` |
| 用途 | SwitchBot APIのトークンを保持する |

設定ノードはフロー上には表示されない。複数のノードから共通の接続設定を参照するために使用する。

## 実装サンプル
https://nodered.jp/docs/creating-nodes/config-nodes

## ノードプロパティ（エディタ設定）

| プロパティ名 | 型 | デフォルト値 | 必須 | 説明 |
|-------------|-----|------------|------|------|
| `token` | `string` | `""` | ✓ | SwitchBot APIのトークン |
| `secret` | `string` | `""` | ✓ | SwitchBot APIのシークレット |

### エディタUI

- `category: "config"` を設定する（フロー上に表示されなくなる）
- 入力要素のIDは **`node-config-input-<プロパティ名>`** とする（通常ノードと異なる点）
- `token` と `secret` の入力フィールドを持つ
