export interface SwitchBotConfig {
  token: string;
  secret: string;
}

export interface Device {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  enableCloudService: boolean;
  hubDeviceId: string;
}

export interface DeviceListResponse {
  statusCode: number;
  message: string;
  body: {
    deviceList: Device[];
    infraredRemoteList: Device[];
  };
}

/** デバイスステータスの共通フィールド */
export interface DeviceStatusBase {
  deviceId: string;
  deviceType: string;
  hubDeviceId: string;
  version: string;
}

/** Plug Mini (JP) のステータス */
export interface PlugMiniStatus extends DeviceStatusBase {
  power: 'on' | 'off';
  /** 電圧 (V) */
  voltage: number;
  /** 消費電力 (W) */
  weight: number;
  /** 当日の消費電力量 (Wh) */
  electricityOfDay: number;
  /** 電流 (mA) */
  electricCurrent: number;
}

/** Bot のステータス */
export interface BotStatus extends DeviceStatusBase {
  power: 'on' | 'off';
  battery: number;
  deviceMode: string;
}

/** Ceiling Light / Ceiling Light Pro のステータス */
export interface CeilingLightStatus extends DeviceStatusBase {
  power: 'on' | 'off';
  /** 輝度 (1-100) */
  brightness: number;
  /** 色温度 (2700-6500) */
  colorTemperature: number;
}

/** Humidifier2 のステータス */
export interface Humidifier2Status extends DeviceStatusBase {
  power: 'on' | 'off';
  mode: number;
  drying: boolean;
  childLock: boolean;
  filterElement: {
    /** フィルターの有効使用時間 (h) */
    effectiveUsageHours: number;
    /** フィルターの使用済み時間 (h) */
    usedHours: number;
  };
  /** 湿度 (%) */
  humidity: number;
}

/** Air Purifier Table VOC のステータス */
export interface AirPurifierStatus extends DeviceStatusBase {
  power: 'ON' | 'OFF';
  mode: number;
  childLock: number;
  /** PM2.5 (μg/m³) */
  pm: number;
}

/** Meter (温湿度計) のステータス */
export interface MeterStatus extends DeviceStatusBase {
  battery: number;
  /** 温度 (℃) */
  temperature: number;
  /** 湿度 (%) */
  humidity: number;
}

/** MeterPro(CO2) のステータス */
export interface MeterProCO2Status extends DeviceStatusBase {
  battery: number;
  /** 温度 (℃) */
  temperature: number;
  /** 湿度 (%) */
  humidity: number;
  /** CO2濃度 (ppm) */
  CO2: number;
}

/** Contact Sensor のステータス */
export interface ContactSensorStatus extends DeviceStatusBase {
  battery: number;
  moveDetected: boolean;
  brightness: 'bright' | 'dim';
  openState: 'open' | 'close';
}

/** Water Detector のステータス */
export interface WaterDetectorStatus extends DeviceStatusBase {
  battery: number;
  /** 水漏れ検知状態 (0: 正常, 1: 検知) */
  status: number;
}

/** Video Doorbell のステータス */
export interface VideoDoorbellStatus extends DeviceStatusBase {
  battery: number;
  online: boolean;
}

/** K10+ (ロボット掃除機) のステータス */
export interface K10PlusStatus extends DeviceStatusBase {
  workingStatus: string;
  onlineStatus: string;
  battery: number;
}

/** Robot Vacuum Cleaner S10 のステータス */
export interface RobotVacuumCleanerS10Status extends DeviceStatusBase {
  workingStatus: string;
  onlineStatus: string;
  battery: number;
  waterBaseBattery: number;
  taskType: string;
}

/** デバイスステータスのユニオン型 */
export type DeviceStatus =
  | PlugMiniStatus
  | BotStatus
  | CeilingLightStatus
  | Humidifier2Status
  | AirPurifierStatus
  | MeterStatus
  | MeterProCO2Status
  | ContactSensorStatus
  | WaterDetectorStatus
  | VideoDoorbellStatus
  | K10PlusStatus
  | RobotVacuumCleanerS10Status;

export interface DeviceStatusResponse {
  statusCode: number;
  message: string;
  body: DeviceStatus;
}

export interface CommandRequest {
  command: string;
  parameter?: string;
  commandType?: string;
}

export interface CommandResponse {
  statusCode: number;
  message: string;
  body: Record<string, unknown>;
}

export interface HttpClient {
  get: (url: string, headers: Record<string, string>) => Promise<unknown>;
  post: (url: string, headers: Record<string, string>, body: unknown) => Promise<unknown>;
}
