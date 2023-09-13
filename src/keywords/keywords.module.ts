// import { Module } from '@nestjs/common';
// import { KeywordsController } from './keywords.controller';
// import { KeywordsService } from './keywords.service';
// import { ConfigModule } from '@nestjs/config';
// import { HttpModule } from '@nestjs/axios';
// import { KeywordsRepository } from './keywords.repository';
// import { S3Service } from 'src/utils/s3.service';
// import { CommonService } from 'src/utils/common.service';
// import { ProjectService } from 'src/project/project.service';

// @Module({
//   imports: [
//     ConfigModule.forRoot({
//           envFilePath: ['.env.development'],
//           isGlobal: true,
//     }),
//     HttpModule,
//   ],
//   controllers: [KeywordsController],
//   providers: [KeywordsService, KeywordsRepository, S3Service, CommonService],
//   exports: [KeywordsService, KeywordsRepository]
// })
// export class KeywordsModule {}
