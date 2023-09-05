import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { ProjectRepository } from './project.repository';
import { HttpModule } from '@nestjs/axios';
import { S3Service } from 'src/utils/s3.service';

@Module({
    imports: [HttpModule],
    controllers: [ProjectController],
    providers: [ProjectService, ProjectRepository, S3Service],
    exports: [ProjectService, ProjectRepository]
})
export class ProjectModule {}
