import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  constructor() {
    const apiKey = process.env.SEM_RUSH_BASE_URL;
    console.log(apiKey)
  }
  getHello(): string {
    return 'Hello World!';
  }
}
