import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SiteAuditService } from './site-audit/site-audit.service';
import { SiteAuditModule } from './site-audit/site-audit.module';
import * as dotenv from 'dotenv';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ProjectController } from './project/project.controller';
import { ProjectService } from './project/project.service';
import { ProjectModule } from './project/project.module';
import { S3Service } from './utils/s3.service';
import { CommonService } from './utils/common.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MongooseModule } from '@nestjs/mongoose';
// import { KeywordsModule } from './keywords/keywords.module';
// import { BacklinksModule } from './backlinks/backlinks.module';

dotenv.config();

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI),
    ConfigModule.forRoot({
          envFilePath: ['.env.development'],
          isGlobal: true,
    }),
    UsersModule,
    AuthModule,
    HttpModule,
    SiteAuditModule,
    ProjectModule,
    // KeywordsModule,
    // BacklinksModule,
  ],
  controllers: [AppController, ProjectController],
  providers: [AppService, ProjectService, CommonService, SiteAuditService, S3Service],
})
export class AppModule {}
