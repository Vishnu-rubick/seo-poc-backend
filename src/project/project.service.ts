import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectRepository } from './project.repository';
import * as fs from 'fs';
import * as csvjson from 'csvjson';
import { Parser } from '@json2csv/plainjs';
import { ConfigDto } from './dto/config.dto';
import { ObjectStorageClass } from '@aws-sdk/client-s3';
import { HttpService } from '@nestjs/axios';
import { S3Service } from 'src/utils/s3.service';
import { ConfigService } from '@nestjs/config';
import { CommonService } from 'src/utils/common.service';
import { InjectModel } from '@nestjs/mongoose';
import { Project, ProjectDocument } from './schemas/project.schema';
import { FilterQuery, Model, Types, _FilterQuery } from 'mongoose';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectService {
    private SEM_RUSH_API_KEY = ''
    private SEM_RUSH_BASE_URL = ''

    constructor(
        private projectRepository: ProjectRepository,
        private http: HttpService,
        private s3Service: S3Service,
        private configService: ConfigService,
        private commonService: CommonService,
    ) {
        this.SEM_RUSH_API_KEY = configService.get('SEM_RUSH_API_KEY');
        this.SEM_RUSH_BASE_URL = configService.get('SEM_RUSH_BASE_URL');
    }

    async createSemProject(createProjectDto: any) {
        return await this.projectRepository.createSemProject(createProjectDto);
    }

    async enableSiteAudit(projectId: string, domain: string, pageLimit: number, crawlSubdomains: boolean) {
        return await this.projectRepository.enableSiteAudit(projectId, domain, {
            pageLimit,
            crawlSubdomains
        })
    }

    async setup2(userId: string, domain: string, pageLimit: number, crawlSubdomains: boolean = false) {
        const projects: any = await this.commonService.fetchFileData(`./data/projects_data.json`)

        if(projects.hasOwnProperty(domain)){
            throw new ConflictException(`Project with ${domain} already exists`);
        }

        // creating a project
        const project: any = await this.createSemProject({
            domainUrl: domain,
            name: `testing-${domain}`   // For development
        })

        //enabling site-audit
        await this.enableSiteAudit(project.data.project_id, domain, pageLimit, crawlSubdomains);
        
        projects[domain] = {
            projectId: project.data.project_id
        }

        await this.commonService.saveFile(`./data/projects_data.json`, JSON.stringify(projects))
        return project;
    }

    async setup(userId: string, configDto: ConfigDto, pageLimit: number, crawlSubdomains: boolean = false) {
        let project: ProjectDocument = await this.projectRepository.create({
            user_id: new Types.ObjectId(userId),
            domain: configDto.domain,
            competitors: configDto.competitors,
            name: configDto.domain,
            crawl_frequency: 0,
            crawl_limit: pageLimit,
            is_exclude_subdomains: crawlSubdomains,
            updated_by: new Types.ObjectId(userId),
            geography_id: configDto.geography,
            industry_id: configDto.industry,
        })

        // creating a project
        let semProject: any = await this.createSemProject({
            domainUrl: configDto.domain,
            name: `testing-${configDto.domain}-${project._id}`   // For development
        })

        //enabling site-audit
        await this.enableSiteAudit(semProject.data.project_id, configDto.domain, pageLimit, crawlSubdomains);

        await this.updateProject(project._id, {
            semProjectId: semProject.data.project_id,
            updated_by: new Types.ObjectId(userId)
        })
    }

    async saveConfig(configDto: ConfigDto, userId: string) {
        // await this.commonService.saveFile(`./data/config.json`, JSON.stringify(configDto));

        // let conf: any = await this.getProject(userId);
        // if(!conf?.projectId){
        //     await this.setup(conf.domain, 400);
        //     conf = await this.getProject(userId);
        // }
        
        // await this.fetchCompetitorAnalysis(conf.projectId, [conf.domain, ...conf.competitors]);
        // return conf;

        let project: ProjectDocument = await this.findProject({
            user_id: new Types.ObjectId(userId),
            domain: configDto.domain
        })

        if(!project || !project.semProjectId){
            await this.setup(userId, configDto, 400);
            project = await this.getProject(userId);
        }
        else{
            await this.updateProject(project._id, {
                updated_by: new Types.ObjectId(userId),
                competitors: configDto.competitors
            })
            project = await this.getProject(userId);
        }

        await this.fetchCompetitorAnalysis(project.semProjectId, [project.domain, ...project.competitors]);
        return project;
    }

    async findProject(filterQuery: FilterQuery<Project>): Promise<ProjectDocument> {
        return await this.projectRepository.findOne(filterQuery);
    }

    async getProject(userId: string): Promise<ProjectDocument> {
        return await this.projectRepository.getProject(userId);
    }

    async updateProject(projectId: string, updateProjectDto: UpdateProjectDto): Promise<void> {
        await this.projectRepository.updateProject(projectId, updateProjectDto);
    }
    
    async fetchCompetitorAnalysis(projectId: string, targetDomainsList: string[]) {
        let targetDomains = "";
        targetDomainsList.forEach((domain) => {
            targetDomains += `,${domain}`
        })
        targetDomains = targetDomains.slice(1, targetDomains.length);
        
        const exportColumns = 'target,rank,visits,categories,desktop_visits,mobile_visits,users,desktop_users,mobile_users,direct,referral,social,search,paid,search_organic,search_paid,social_organic,social_paid,mail,display_ad,unknown_channel,time_on_site,desktop_time_on_site,mobile_time_on_site,pages_per_visit,desktop_pages_per_visit,mobile_pages_per_visit,bounce_rate,desktop_bounce_rate,mobile_bounce_rate,desktop_share,mobile_share,accuracy,display_date,country,device_type'

        const apiUrl = `${this.SEM_RUSH_BASE_URL}/analytics/ta/api/v3/summary?targets=${targetDomains}&export_columns=${exportColumns}&key=${this.SEM_RUSH_API_KEY}`
        const trafficAnalysisSummaryResponse = await this.http.get(apiUrl).toPromise();

        // let trafficAnalysisSummaryResponse = {
        //     data: `target;rank;visits;categories;desktop_visits;mobile_visits;users;desktop_users;mobile_users;direct;referral;social;search;paid;search_organic;search_paid;social_organic;social_paid;mail;display_ad;unknown_channel;time_on_site;desktop_time_on_site;mobile_time_on_site;pages_per_visit;desktop_pages_per_visit;mobile_pages_per_visit;bounce_rate;desktop_bounce_rate;mobile_bounce_rate;desktop_share;mobile_share;accuracy;display_date;country;device_type
        //     wittypen.com;2254213;6620;"advertising_and_marketing;online_services;writing_and_editing_services";6620;0;4544;4544;0;2744;0;0;1524;0;1524;0;0;0;2352;0;0;747;747;0;3.2222;3.2222;0;0.2891;0.2891;0;1;0;1;2023-07-01;GLOBAL;all
        //     peppercontent.io;128140;414397;"advertising_and_marketing;writing_and_editing_services";143600;270797;349144;99020;250124;84081;247942;754;79871;0;79871;0;754;0;1749;0;0;874;978;198;1.5938;2.6596;1.0286;0.8599;0.6498;0.9714;0.3465276051708869;0.6534723948291131;2;2023-07-01;GLOBAL;all
        //     rubick.ai;7067157;461;n/a;461;0;461;461;0;230;0;0;0;230;0;230;0;0;0;0;0;0;0;0;1;1;0;1;1;0;1;0;1;2023-07-01;GLOBAL;all`
        // }
        const competitorAnalysisCSVData = trafficAnalysisSummaryResponse.data;
        const jsonData = csvjson.toObject(competitorAnalysisCSVData, {
            delimiter: ';',
        });

        if(!jsonData.length)    throw new NotFoundException('Competitor Analysis Not Found')
        
        // save csv to s3 :)
        let formattedJson = [];
        let totalVisits = 0;
        let mainDomainIdx = 0;
        jsonData.forEach((domain, idx) => {
            if(domain.target == targetDomainsList[0])  mainDomainIdx = idx;
            totalVisits += parseInt(domain.visits);
        });
        [jsonData[0], jsonData[mainDomainIdx]] = [jsonData[mainDomainIdx], jsonData[0]];
        
        jsonData.forEach((domainObj) => {
            formattedJson.push({
                'Domain': domainObj.target, 
                'Domain Authority': 'NA',
                'Organic Search Traffic': domainObj?.search_organic || 0,
                // 'Organic Keywords': 'Coming Soon',
                'Paid Search Traffic': domainObj?.search_paid || 0,
                'Visitors': domainObj?.visits || 0,
                'Unique Visitors': domainObj?.users || 0,
                'Avg. Visit Duration': domainObj?.time_on_site || 0,
                'Bounce Rate': domainObj?.bounce_rate || 0,
                'Traffic Share': ((domainObj?.visits/totalVisits) * 100) || 100,
            });
        });

        const display_date = jsonData[0].display_date;
        // save in mongo
        // await this.commonService.saveFile(`./data/${projectId}_${display_date}_competitor_Analysis.json`, JSON.stringify(formattedJson));
        await this.commonService.saveFile(`./data/${projectId}_2023-07-01_competitor_Analysis.json`, JSON.stringify(formattedJson));

        // save in s3
        const csvData = this.commonService.getCSV(formattedJson);
        // const path = `projects/serp/${projectId}/site-audit/${display_date}_competitor_Analysis.csv`;
        const path = `projects/serp/${projectId}/site-audit/2023-07-01_competitor_Analysis.csv`;

        // await this.commonService.saveFile(`./data/${projectId}_${display_date}_competitor_Analysis.csv`, csvData);
        await this.commonService.saveFile(`./data/${projectId}_2023-07-01_competitor_Analysis.csv`, csvData);
        const res = await this.s3Service.s3_upload(
            csvData,
            process.env.AWS_BUCKET_NAME, 
            path,
        );
        
        return formattedJson;
    }
}
