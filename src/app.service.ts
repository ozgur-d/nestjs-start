import { Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

/**************************************************/
const envFile = process.env.NODE_ENV
  ? `./.env.${process.env.NODE_ENV}`
  : './.env';
/**************************************************/
// Mevcut process.env değerlerini korumak için yardımcı fonksiyon
const loadEnvFile = (envPath: string): void => {
  try {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    // Sadece process.env'de olmayan değerleri ekle
    for (const key in envConfig) {
      if (!process.env[key]) {
        process.env[key] = envConfig[key];
      }
    }
  } catch (error) {
    console.log(`ENV: ${envPath} not found`);
  }
};
console.log('**************************************************');
console.log('process.env.NODE_ENV:', process.env.NODE_ENV);
loadEnvFile(envFile);
console.log('**************************************************');
@Injectable()
export class AppService {
  constructor() {}
}
