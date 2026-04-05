# SwitchBotクラスの仕様

## SwitchBot APIの仕様
- https://github.com/OpenWonderLabs/SwitchBotAPI

## 機能一覧
| 機能 | 説明 |
|------|------|
| デバイス一覧の取得 | SwitchBot APIからデバイス一覧を習得する |
| デバイス情報の取得 | 指定されたデバイスの情報を、SwitchBot APIから習得する |
| デバイス操作 | SwitchBot APIを使用して、デバイスを操作する |

## エンドポイント
| 機能 | エンドポイント |
|------|------|
| デバイス一覧の取得 | https://api.switch-bot.com/v1.1/devices |
| デバイス情報の取得 | https://api.switch-bot.com/v1.1/devices/{deviceId}/status |
| デバイス操作 | https://api.switch-bot.com/v1.1/devices/{deviceId}/commands |

## 補足
SwitchBot APIから取得した情報の形定義を適宜作成する
