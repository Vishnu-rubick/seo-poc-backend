import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommonService } from 'src/utils/common.service';
import { S3Service } from 'src/utils/s3.service';

@Injectable()
export class BacklinksService {
    private SEM_RUSH_API_KEY = ''
    private SEM_RUSH_BASE_URL = ''

    constructor(
        private http: HttpService,
        private s3Service: S3Service,
        private configService: ConfigService,
        private commonService: CommonService,
    ) {
        this.SEM_RUSH_API_KEY = configService.get('SEM_RUSH_API_KEY');
        this.SEM_RUSH_BASE_URL = configService.get('SEM_RUSH_BASE_URL');
    }

    
}
