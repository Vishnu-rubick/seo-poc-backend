import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { ProjectRepository } from './project.repository';
import { HttpModule } from '@nestjs/axios';
import { S3Service } from 'src/utils/s3.service';
import { CommonService } from 'src/utils/common.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Project, ProjectSchema } from './schemas/project.schema';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }]), 
        HttpModule
    ],
    controllers: [ProjectController],
    providers: [ProjectService, ProjectRepository, S3Service, CommonService],
    exports: [ProjectService, ProjectRepository]
})
export class ProjectModule {}
