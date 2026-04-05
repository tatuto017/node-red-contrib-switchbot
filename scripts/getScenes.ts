import * as fs from 'fs';
import * as path from 'path';
import { SwitchBot } from '../src/switchbot/switchbot';
import { fetchHttpClient } from '../src/switchbot/fetchHttpClient';

const loadEnv = (): void => {
  const envPath = path.resolve(process.cwd(), '.env');
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...valueParts] = trimmed.split('=');
    process.env[key.trim()] = valueParts.join('=').trim();
  }
};

const main = async (): Promise<void> => {
  loadEnv();

  const token = process.env.SWITCHBOT_TOKEN;
  const secret = process.env.SWITCHBOT_SECRET;
  if (!token || !secret) {
    throw new Error('.env に SWITCHBOT_TOKEN と SWITCHBOT_SECRET を設定してください');
  }

  const switchBot = new SwitchBot({ token, secret }, fetchHttpClient);
  const result = await switchBot.getScenes();

  console.log(JSON.stringify(result, null, 2));
};

main().catch(console.error);
