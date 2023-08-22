import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectService } from './project.service';

@Controller('project')
export class ProjectController {
    constructor(
        private readonly projectService: ProjectService
    ) {}

    @Post()
    async createProject(
        @Body() createProjectDto: CreateProjectDto
    ) {
        return await this.projectService.createProject(createProjectDto);
    }
}
