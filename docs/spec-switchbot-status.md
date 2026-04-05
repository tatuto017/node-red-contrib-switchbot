# ノード仕様書: switchbot-status

## 概要

| 項目 | 内容 |
|------|------|
| ノード名 | `switchbot-status` |
| パッケージ名 | `node-red-contrib-switchbot` |
| カテゴリ | `SwitchBot` |
| 入力ポート数 | 0 |
| 出力ポート数 | 1 |

## 機能説明

SwitchBot APIを使用して、指定されたデバイスのステータスを取得する  
デバイス一覧は、SwitchBotクラスのデバイス一覧取得機能を使用して取得する
編集画面が開かれたタイミングで、認証情報が設定されていればデバイス一覧を取得する
取得した一覧から、下記のデバイスタイプに絞る
- Plug Mini (JP)
- Bot
- Ceiling Light/Ceiling Light Pro
- Humidifier2
- Air Purifier Table VOC
- Meter/MeterPro(CO2)
`Ceiling Light`と`Ceiling Light Pro`は`Ceiling Light`として扱って下さい
`Meter`と`MeterPro(CO2)`は`Meter`として扱って下さい

## デバイスタイプのプルダウン表示
| デバイスタイプ | 表示名 |
|-------------|-------|
| Plug Mini (JP) | スマートプラグ |
| Bot | Bot |
| Ceiling Light | シーリングライト |
| Humidifier2 | 除湿機 |
| Air Purifier Table VOC | 空気清浄機 |
| Meter | 温湿度計 |

## SwitchBot APIの仕様
https://github.com/OpenWonderLabs/SwitchBotAPI

## 実装サンプル
https://nodered.jp/docs/creating-nodes/first-node

## 出力

| プロパティ | 型 | 説明 |
|-----------|----|------|
| `msg.payload` | `array` | 取得したデバイスのステータス |

## 編集画面

### 入力項目共通仕様
選択済みの項目は再選択を行う

### 入力項目
| 項目 | 入力タイプ | 内容 | 備考 |
|------|------|------|------|
| デバイスタイプ | プルダウン | デバイスのタイプを選択出来る | リフレッシュボタンを付けて。ボタンが押されたらデバイス一覧を再取得する |
| デバイス | プルダウン | デバイス一覧からデバイスを選択出来る | |

- `デバイスタイプ`を選択すると、`デバイス`の一覧が、選択したデバイスタイプに一致するデバイスに絞られる
