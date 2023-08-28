import * as fs from 'fs';
import { Injectable, Logger } from '@nestjs/common';
import { FilterQuery, Model, PipelineStage, Types } from 'mongoose';

import { CreateProjectDto } from './dto/create-project.dto';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ProjectRepository {
    private SEM_RUSH_API_KEY = ''
    private SEM_RUSH_BASE_URL = ''

    constructor(
        private http: HttpService,
        private configService: ConfigService
    ) {
        this.SEM_RUSH_API_KEY = configService.get('SEM_RUSH_API_KEY');
        this.SEM_RUSH_BASE_URL = configService.get('SEM_RUSH_BASE_URL');
    }
    
    async fetchFileData(filePath: string){
        let content = '';
        if(fs.existsSync(filePath))    content = fs.readFileSync(filePath, 'utf-8');
        if(!content || !content.length) return null;
        let data = JSON.parse(content);

        return data;
    }

    async create(createProjectDto: CreateProjectDto) {
        const response = await this.http.post(`${this.SEM_RUSH_BASE_URL}/management/v1/projects?key=${this.SEM_RUSH_API_KEY}`).toPromise();
        return response.data;
    }

    async enableSiteAudit(projectId: string, domain: string, options?: any) {
        const response = await this.http.post(`${this.SEM_RUSH_BASE_URL}/management/v1/projects/${projectId}/siteaudit/enable?key=${this.SEM_RUSH_API_KEY}`, {
            "domain": domain || "",
            "scheduleDay": 0,
            "notify": options?.notify || true,
            "crawlSubdomains": options?.crawlSubdomains || false,
            "pageLimit": options?.pageLimit || 400,
            "respectCrawlDelay": false
        }).toPromise();
        return response.data;
    }

    async createProject(createProjectDto: CreateProjectDto) {
        const projects = await this.fetchFileData(`./data/projects_data.json`);
        
        if(projects[createProjectDto.domainUrl])    return {
            message: 'Project with the given domain already exists',
            data: projects[createProjectDto.domainUrl],
        }

        const project = await this.create(createProjectDto);

        return {
            message: "Project has been created",
            data: {}
        };
    }
}
