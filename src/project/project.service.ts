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

@Injectable()
export class ProjectService {
    private SEM_RUSH_API_KEY = ''
    private SEM_RUSH_BASE_URL = ''

    constructor(
        private projectRepository: ProjectRepository,
        private http: HttpService,
        private s3Service: S3Service,
        private configService: ConfigService,
    ) {
        this.SEM_RUSH_API_KEY = configService.get('SEM_RUSH_API_KEY');
        this.SEM_RUSH_BASE_URL = configService.get('SEM_RUSH_BASE_URL');
    }

    async createProject(createProjectDto: CreateProjectDto) {
        return await this.projectRepository.createProject(createProjectDto);
    }

    async enableSiteAudit(projectId: string, domain: string, pageLimit: number, crawlSubdomains: boolean) {
        return await this.projectRepository.enableSiteAudit(projectId, domain, {
            pageLimit,
            crawlSubdomains
        })
    }

    async setup(domain: string, pageLimit: number, crawlSubdomains: boolean = false) {
        const projects: any = await this.fetchFileData(`./data/projects_data.json`)

        if(projects.hasOwnProperty(domain)){
            throw new ConflictException(`Project with ${domain} already exists`);
        }

        // creating a project
        const project: any = await this.createProject({
            domainUrl: domain,
            name: `testing-${domain}`   // For development
        })

        //enabling site-audit
        await this.enableSiteAudit(project.data.project_id, domain, pageLimit, crawlSubdomains);
        
        projects[domain] = {
            projectId: project.data.project_id
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

        let conf: any = await this.getConfig();
        if(!conf?.projectId){
            await this.setup(conf.domain, 400);
            conf = await this.getConfig();
        }
        
        await this.fetchCompetitorAnalysis(conf.projectId, [conf.domain, ...conf.competitors]);
        return conf;
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
                'Unique Visitors': 'NA',
                'Avg. Visit Duration': domainObj?.time_on_site || 0,
                'Bounce Rate': domainObj?.bounce_rate || 0,
                'Traffic Share': ((domainObj?.visits/totalVisits) * 100) || 100,
            });
        });

        const display_date = jsonData[0].display_date;
        // save in mongo
        // await this.saveFile(`./data/${projectId}_${display_date}_competitor_Analysis.json`, JSON.stringify(formattedJson));
        await this.saveFile(`./data/${projectId}_2023-07-01_competitor_Analysis.json`, JSON.stringify(formattedJson));

        // save in s3
        const csvData = this.getCSV(formattedJson);
        // const path = `projects/serp/${projectId}/site-audit/${display_date}_competitor_Analysis.csv`;
        const path = `projects/serp/${projectId}/site-audit/2023-07-01_competitor_Analysis.csv`;

        // await this.saveFile(`./data/${projectId}_${display_date}_competitor_Analysis.csv`, csvData);
        await this.saveFile(`./data/${projectId}_2023-07-01_competitor_Analysis.csv`, csvData);
        const res = await this.s3Service.s3_upload(
            csvData,
            process.env.AWS_BUCKET_NAME, 
            path,
        );
        
        return formattedJson;
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

    getCSV(obj: any) {
        const parser = new Parser();
        const csv = parser.parse(obj);
        return csv;
    }
}
