import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { ProjectRepository } from './project.repository';
import { HttpModule } from '@nestjs/axios';

@Module({
    imports: [HttpModule],
    providers: [ProjectService, ProjectRepository],
    controllers: [ProjectController],
    exports: [ProjectService, ProjectRepository]
})
export class ProjectModule {}
