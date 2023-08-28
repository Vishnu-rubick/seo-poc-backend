import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectRepository } from './project.repository';
import * as fs from 'fs';
import { ConfigDto } from './dto/config.dto';
import { ObjectStorageClass } from '@aws-sdk/client-s3';

@Injectable()
export class ProjectService {
    constructor(
        private projectRepository: ProjectRepository
    ) {}

    async createProject(createProjectDto: CreateProjectDto) {
        return await this.projectRepository.createProject(createProjectDto);
    }

    async enableSiteAudit(projectId: string, domain: string, pageLimit: number, crawlSubdomains: boolean) {
        return await this.projectRepository.enableSiteAudit(projectId, domain, {
            pageLimit,
            crawlSubdomains
        })
    }

    async setup(domain: string, pageLimit: number, crawlSubdomains: boolean) {
        const projects: any = await this.fetchFileData(`./data/projects_data.json`)

        if(projects.hasOwnProperty(domain)){
            throw new ConflictException(`Project with ${domain} already exists`);
        }

        // creating a project
        const project: any = await this.createProject({
            domainUrl: domain,
            name: domain
        })

        //enabling site-audit
        await this.enableSiteAudit(project.project_id, domain, pageLimit, crawlSubdomains);
        
        projects[domain] = {
            projectId: project.project_id
        }

        await this.saveFile(`./data/projects_data.json`, JSON.stringify(projects))

        return project;
    }

    async getConfig() {
        const config: any = await this.fetchFileData(`./data/config.json`);
        if(!config || Object.keys(config).length == 0) throw new NotFoundException('No config data found');

        let projectId = null;

        const projects = await this.fetchFileData(`./data/projects_data.json`);
        if(projects.hasOwnProperty(config?.domain)){
            projectId = projects[config?.domain].projectId;
        }

        return {
            ...config,
            projectId: projectId
        }
    }

    async saveConfig(configDto: ConfigDto) {
        await this.saveFile(`./data/config.json`, JSON.stringify(configDto));
    }

    async fetchFileData(filePath: string){
        let content = '';
        if(fs.existsSync(filePath))    content = fs.readFileSync(filePath, 'utf-8');
        if(!content || !content.length) return null;
        let data = JSON.parse(content);

        return data;
    }

    async saveFile(filePath: string, obj: string){
        fs.writeFileSync(filePath, obj, 'utf-8');
    }
}
