import * as fs from 'fs';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FilterQuery, Model, PipelineStage, Types } from 'mongoose';

import { CreateProjectDto } from './dto/create-project.dto';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Project, ProjectDocument } from './schemas/project.schema';
import { InjectModel } from '@nestjs/mongoose';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectRepository {
    private SEM_RUSH_API_KEY = ''
    private SEM_RUSH_BASE_URL = ''

    constructor(
        private http: HttpService,
        private configService: ConfigService,
        @InjectModel(Project.name) private ProjectModel: Model<ProjectDocument>
    ) {
        this.SEM_RUSH_API_KEY = configService.get('SEM_RUSH_API_KEY');
        this.SEM_RUSH_BASE_URL = configService.get('SEM_RUSH_BASE_URL');
    }

    async fetchFileData(filePath: string) {
        let content = '';
        if (fs.existsSync(filePath)) content = fs.readFileSync(filePath, 'utf-8');
        if (!content || !content.length) return null;
        let data = JSON.parse(content);

        return data;
    }

    async findOne(filterQuery: FilterQuery<Project>): Promise<ProjectDocument> {
        return await this.ProjectModel.findOne(filterQuery);
    }

    async getProject(userId: string): Promise<ProjectDocument>{
        const project = await this.ProjectModel.aggregate([
            {
                $match: {
                    user_id: new Types.ObjectId(userId),
                    is_active: true
                }
            },
            {
                $sort: {
                    updatedAt: -1
                }
            },
            {
                $limit: 1
            }
        ])

        if(!project || !project[0]) throw new NotFoundException('No project Found');

        return project[0];
    }

    async createSem(createProjectDto: any) {
        const response = await this.http.post(`${this.SEM_RUSH_BASE_URL}/management/v1/projects?key=${this.SEM_RUSH_API_KEY}`, { url: createProjectDto.domainUrl, project_name: createProjectDto.name }).toPromise();
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

    async createProject2(createProjectDto: any) {
        const projects = await this.fetchFileData(`./data/projects_data.json`);
        // check if project already exists
        

        if (projects[createProjectDto.domainUrl]) return {
            message: 'Project with the given domain already exists',
            data: projects[createProjectDto.domainUrl],
        }

        const project = await this.create(createProjectDto);

        return {
            message: "Project has been created",
            data: project
        };
    }

    async create(createProjectDto: CreateProjectDto): Promise<ProjectDocument> {
        return await this.ProjectModel.create(createProjectDto);
    }
    

    async createSemProject(createProjectDto: any) {
        const project = await this.createSem(createProjectDto);

        return {
            message: "Project has been created",
            data: project
        };
    }

    async updateProject(projectId: string, updateProjectDto: UpdateProjectDto): Promise<void> {
        await this.ProjectModel.updateOne({_id: new Types.ObjectId(projectId)}, updateProjectDto, { new: true })
    }
}
