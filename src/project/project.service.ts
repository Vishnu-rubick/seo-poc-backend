import { Injectable } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectRepository } from './project.repository';

@Injectable()
export class ProjectService {
    constructor(
        private projectRepository: ProjectRepository
    ) {}

    async createProject(createProjectDto: CreateProjectDto) {
        return await this.projectRepository.createProject(createProjectDto);
    }
}
