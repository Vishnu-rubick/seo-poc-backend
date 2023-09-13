// import { Module } from '@nestjs/common';
// import { BacklinksService } from './backlinks.service';
// import { BacklinksController } from './backlinks.controller';
// import { ConfigModule } from '@nestjs/config';
// import { HttpModule } from '@nestjs/axios';
// import { BacklinksRepository } from './backlinks.repository';
// import { S3Service } from 'src/utils/s3.service';
// import { CommonService } from 'src/utils/common.service';

// @Module({
//   imports: [
//     ConfigModule.forRoot({
//           envFilePath: ['.env.development'],
//           isGlobal: true,
//     }),
//     HttpModule,
//   ],
//   controllers: [BacklinksController],
//   providers: [BacklinksService, BacklinksRepository, S3Service, CommonService],
//   exports: [BacklinksService, BacklinksRepository]
// })
// export class BacklinksModule {}
