import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectService } from './project.service';

import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ConfigDto } from './dto/config.dto';
import { SetupDto } from './dto/setup.dto';


@Controller('project')
@ApiTags('Projects')
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

    @Get('/config')
    async getConfig() {
        return await this.projectService.getConfig();
    }

    @Post('/setup')
    async setup(
        @Body() setupDto: SetupDto
    ) {
        return await this.projectService.setup(setupDto.domain, setupDto.pageimit, setupDto?.crawlsubdomains);
    }

    @Post('/config')
    async saveConfig(
        @Body() configDto: ConfigDto
    ) {
        return await this.projectService.saveConfig(configDto);
    }
}
