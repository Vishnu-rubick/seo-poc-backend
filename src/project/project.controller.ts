import { Body, Controller, Get, NotFoundException, Post, Query } from '@nestjs/common';
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

    @Get('/config')
    async getConfig(
        @Query('userId') userId: string
    ) {
        if(!userId) return new NotFoundException('User ID is mandatory');
        return await this.projectService.getProject(userId);
    }

    @Post('/config')
    async saveConfig(
        @Body() configDto: ConfigDto,
        @Query('userId') userId: string
    ) {
        return await this.projectService.saveConfig(configDto, userId);
    }
}
