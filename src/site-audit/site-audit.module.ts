import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { SiteAuditController } from './site-audit.controller';
import { SiteAuditRepository } from './site-audit.repository';
import { SiteAuditService } from './site-audit.service';

import * as dotenv from 'dotenv';
import { S3Service } from 'src/utils/s3.service';
import { CommonService } from 'src/utils/common.service';
import { ProjectService } from 'src/project/project.service';
import { ProjectModule } from 'src/project/project.module';
dotenv.config();


@Module({
  imports: [
    ConfigModule.forRoot({
          envFilePath: ['.env.development'],
          isGlobal: true,
    }),
    HttpModule,
    ProjectModule
  ],
  controllers: [SiteAuditController],
  providers: [SiteAuditService, SiteAuditRepository, S3Service, CommonService],
  exports: [SiteAuditService, SiteAuditRepository]
})
export class SiteAuditModule {}