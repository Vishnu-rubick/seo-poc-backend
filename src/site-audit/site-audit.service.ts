import { Parser } from '@json2csv/plainjs';
import { HttpService } from '@nestjs/axios';
import { ConflictException, ForbiddenException, Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catchError, map } from 'rxjs';
import { join } from 'path';
import { Types } from 'mongoose';

import * as fs from 'fs';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { S3Service } from 'src/utils/s3.service';
import { ProjectService } from 'src/project/project.service';
import { ProjectDocument } from 'src/project/schemas/project.schema';

@Injectable()
export class SiteAuditService {
    private SEM_RUSH_API_KEY = ''
    private SEM_RUSH_BASE_URL = ''

    constructor(
        private http: HttpService,
        private s3Service: S3Service,
        private configService: ConfigService,
        private projectService: ProjectService,
    ) {
        this.SEM_RUSH_API_KEY = configService.get('SEM_RUSH_API_KEY');
        this.SEM_RUSH_BASE_URL = configService.get('SEM_RUSH_BASE_URL');
    }

    async runAudit(userId: string, projectId: string, domain: string, pageLimit: number, crawlSubdomains: boolean, crawlFrequency: number) {
        const prevCampaignData: any = await this.fetchCampaign(projectId);
        if(prevCampaignData && prevCampaignData.status != 'FINISHED'){
            return {
                statusCode: 409,
                message: "An audit is already running. Please wait for it to finish..."
            };
        }
        const project: ProjectDocument = await this.projectService.getProject(userId);

        await this.projectService.updateProject(project._id, {
            updated_by: new Types.ObjectId(userId),
            crawl_frequency: crawlFrequency
        })
        
        const editSettings = await this.updateCampaign(projectId, {
            pageLimit: pageLimit,
            crawlSubdomains: crawlSubdomains,
            domain: domain,
            notify: false,
            scheduleDay: 0
        })
        const runAuditResponse = await this.http.post(`${this.SEM_RUSH_BASE_URL}/reports/v1/projects/${projectId}/siteaudit/launch?key=${this.SEM_RUSH_API_KEY}`).toPromise();
        const snapshotId = runAuditResponse.data.snapshot_id;
        const campaignData = await this.fetchCampaign(projectId);

        await this.projectService.updateProject(project._id, {
            updated_by: new Types.ObjectId(userId),
            snapshot_id: snapshotId
        })

        return {
            statusCode: 200,
            message: "Audit is running",
            data: campaignData
        };
    }

    async enableAudit(projectId: string) {
        const runAuditResponse = await this.http.get(`${this.SEM_RUSH_BASE_URL}/management/v1/projects/${projectId}/siteaudit/enable?key=${this.SEM_RUSH_API_KEY}`).toPromise();
        return runAuditResponse.data;
    }

    async fetchCampaign(projectId: string) {
        try {
            const apiUrl = `${this.SEM_RUSH_BASE_URL}/reports/v1/projects/${projectId}/siteaudit/info?key=${this.SEM_RUSH_API_KEY}`
            const campaignData = await this.http.get(apiUrl).toPromise();
            const data = campaignData.data;
            if(!data)   throw new NotFoundException();

            data.createdAt = new Date()
            // save Data in json w.r.t its projectId
            // fs.writeFileSync(`./data/${projectId}_campaign_data${data.crawlSubdomains ? '_subDomains' : ''}.json`, JSON.stringify(data, null, 2), 'utf-8');
            fs.writeFileSync(`./data/${projectId}_campaign_data.json`, JSON.stringify(data, null, 2), 'utf-8');
            return data;
        }
        catch(err){
            console.log(err)
            throw new Error(err);
        }
    }

    async fetchIssueAndPageDetails(projectId: string, crawlSubdomains: boolean = false){
        await this.fetchIssuesDescription(projectId, crawlSubdomains);
        await this.savePagesDetails(projectId, "", crawlSubdomains);    
    }

    // async disableCrawlingSubddomainsAndRunAudit(projectId: string) {
    //     const prevData = await this.fetchCampaign(projectId);
    //     await this.updateCampaign(projectId, {crawlSubdomains: false, pageLimit: prevData.current_snapshot.pages_limit, domain: prevData.projectDomain });
    //     await this.runAudit(projectId);
    //     await this.updateCampaign(projectId, {crawlSubdomains: true, pageLimit: prevData.current_snapshot.pages_limit, domain: prevData.projectDomain});
    // }

    async getCampaign(projectId: string, crawlSubdomains: boolean = false) {
        let campaignData = null;
        if(fs.existsSync(`./data/${projectId}_campaign_data.json`)) campaignData = await this.fetchFileData(`./data/${projectId}_campaign_data.json`);

        // let campaignDataSubDomains = null;
        // if(crawlSubdomains){
        //     if(fs.existsSync(`./data/${projectId}_campaign_data_subDomains.json`)) campaignDataSubDomains = await this.fetchFileData(`./data/${projectId}_campaign_data_subDomains.json`);
        // }
        let isFetchedIssueAndPageDetails = false;
        const currentDate: Date = new Date(); 
        const objCreatedAt: Date = campaignData ? new Date(campaignData.createdAt) : currentDate;
        const timeDifference: number = currentDate.getTime() - objCreatedAt.getTime();
        const fiveMinutesInMilliseconds: number = 5 * 60 * 1000;

        if(!campaignData || (campaignData.status != 'FINISHED' && timeDifference > fiveMinutesInMilliseconds)) {
            console.log("campaign fetched :)")
            campaignData = await this.fetchCampaign(projectId);
            if(campaignData.status == 'FINISHED'){
                isFetchedIssueAndPageDetails = true;
                this.fetchIssueAndPageDetails(projectId, false);
            }
        }
        if(!fs.existsSync(`./data/${projectId}_issues_description.json`) || !isFetchedIssueAndPageDetails){
            this.fetchIssueAndPageDetails(projectId, false);
        }

        // if(crawlSubdomains){
        //     if(!campaignDataSubDomains || campaignDataSubDomains.status != 'FINISHED') {
        //         campaignDataSubDomains = await this.fetchCampaign(projectId);
        //         if(campaignDataSubDomains.status == 'FINISHED'){
        //             this.fetchIssueAndPageDetails(projectId, campaignDataSubDomains.crawlSubdomains);
        //             this.disableCrawlingSubddomainsAndRunAudit(projectId);
        //         }
        //     }
        //     if(!fs.existsSync(`./data/${projectId}_issues_description_subDomains`)){
        //         this.fetchIssueAndPageDetails(projectId, campaignDataSubDomains.crawlSubdomains);
        //     }
        // }

        // if(!crawlSubdomains || (crawlSubdomains && campaignDataSubDomains.status === 'FINISHED')){
        // }

        return campaignData;
    }

    async updateCampaign(projectId: string, updateCampaignDto: UpdateCampaignDto) {
        try{
            const apiUrl = `${this.SEM_RUSH_BASE_URL}/management/v1/projects/${projectId}/siteaudit/save?key=${this.SEM_RUSH_API_KEY}`;
            let updatedCampaign = await this.http.post(apiUrl, updateCampaignDto).toPromise();
            return updatedCampaign.data;
        }
        catch(err){
            console.log(err);
            throw err
        }
    }

    // calls the get issue Description api to saves all issues Description in a file
    async fetchIssueDescriptions(projectId: string, snapshotId: string, issueId: string, limit: string) {
        const apiUrl = `${this.SEM_RUSH_BASE_URL}/reports/v1/projects/${projectId}/siteaudit/snapshot/${snapshotId}/issue/${issueId}/?limit=${limit}&key=${this.SEM_RUSH_API_KEY}`
        const issuesResponse = await this.http.get(apiUrl).toPromise();
        const issuesData = issuesResponse.data;
        return issuesData;
    }

    async fetchFileData(filePath: string){
        let content = '';
        if(fs.existsSync(filePath))    content = fs.readFileSync(filePath, 'utf-8');
        if(!content || !content.length) return null;
        let data = JSON.parse(content);

        return data;
    }

    // fetches description for all issues from sem-rush
    async fetchIssuesDescription(projectId: string, crawlSubdomains: boolean = false) {
        let issuesResult = {};
            
        let data = null;
        // if(crawlSubdomains) data = await this.fetchFileData(`./data/${projectId}_campaign_data_subDomains.json`);
        // else data = await this.fetchFileData(`./data/${projectId}_campaign_data.json`);
        data = await this.fetchFileData(`./data/${projectId}_campaign_data.json`);
        if(!data)   throw new NotFoundException('Data not available. Please run an audit and wait for sometime...');

        const project: ProjectDocument = await this.projectService.findProject({semProjectId: projectId});
        const snapshotId = project.snapshot_id;

        const defects = data.defects;
        for(const issueId in defects){
            const limit = defects[issueId];

            const issuesData = await this.fetchIssueDescriptions(projectId, snapshotId, issueId, limit);
            issuesResult[issueId] = issuesData;
        }

        // if(crawlSubdomains) fs.writeFileSync(`./data/${projectId}_issues_description_subDomains.json`, JSON.stringify(issuesResult, null, 2), 'utf-8');
        // else fs.writeFileSync(`./data/${projectId}_issues_description.json`, JSON.stringify(issuesResult, null, 2), 'utf-8');
        fs.writeFileSync(`./data/${projectId}_issues_description.json`, JSON.stringify(issuesResult, null, 2), 'utf-8');

        const issueData = await this.getIssues(projectId);
        const issueCSVData = this.getCSV(issueData);
        const issuePath = `projects/serp/${projectId}/issues-csv.csv`;
        const issueS3Response = await this.s3Service.s3_upload(
            issueCSVData,
            process.env.AWS_BUCKET_NAME,
            issuePath,
        );

        const pageData = await this.getPagesDetails(projectId, 0);
        const pageCSVData = this.getCSV(pageData);
        const pagePath = `projects/serp/${projectId}/pages-csv.csv`;
        const pageS3Response = await this.s3Service.s3_upload(
            pageCSVData,
            process.env.AWS_BUCKET_NAME,
            pagePath,
        );

        return issuesResult;
    }

    // Returns an issue Id's List of description with an offset and limit from the file
    async getIssuesDescription(projectId: string, issueId: string, page: number, crawlSubdomains: boolean = false) {
        const issuesDescriptions = await this.fetchFileData(`./data/${projectId}_issues_description.json`);
        if(!issuesDescriptions)   throw new NotFoundException('Unable to Get Issues Descriptions');

        const issuesData = issuesDescriptions[issueId]?.data;
        if(!issuesData) throw new NotFoundException('Unable to Get Issues Descriptions');

        let result = []
        
        const groupedCounts = issuesData.reduce((result, item) => {
            const sourceUrl = item.source_url;
          
            if (!result[sourceUrl]) {
              result[sourceUrl] = 1;
            } else {
              result[sourceUrl]++;
            }
          
            return result;
        }, {});
          
          // Convert the groupedCounts object to an array of objects with 'pageUrl' and 'count'
        const resultArray = Object.keys(groupedCounts).map((pageUrl) => ({
            pageUrl,
            count: groupedCounts[pageUrl],
        }));

        // let low = page*10, high = Math.min(issuesData.length, low + 10);
        let low = page*10, high = resultArray.length;
        
        for(let idx = low; idx < high; ++idx){
            result.push(resultArray[idx])
        }

        // Paginated issues Description
        return result;
    }

    async getCompetitorAnalysis(projectId: string) {    
        let competitorData = null;
        let config = await this.fetchFileData(`./data/config.json`);
        if(fs.existsSync(`./data/${projectId}_2023-07-01_competitor_Analysis.json`)) competitorData = await this.fetchFileData(`./data/${projectId}_2023-07-01_competitor_Analysis.json`);
        return competitorData;
    }

    getCSV(obj: any) {
        if(!obj || obj == "")   return "";
        const parser = new Parser();
        const csv = parser.parse(obj);
        return csv;
    }

    // Returns List of issues present on the project and its basic description along with its category
    async getIssues(projectId: string, crawlSubdomains: boolean = false) {
        let campaignData = await this.fetchFileData(`./data/${projectId}_campaign_data.json`);
        if(!campaignData)   throw new NotFoundException('Data not available. Please run an audit and wait for sometime...');
        let issuesData = campaignData.defects;

        const issueCategoryData = await this.fetchFileData(`./data/issuesCategoryMapped.json`);

        let result = [];

        for(const issueId in issuesData){
            const issueObj = issueCategoryData.find((iss) => iss.id == issueId)

            if(issueObj.category == 'crawl')    issueObj.category = 'Crawlability'
            else if(issueObj.category == 'broken')    issueObj.category = 'Broken Links'
            else if(issueObj.category == 'markup')    issueObj.category = 'Text/Image'
            else if(issueObj.category == 'tech')    issueObj.category = 'HTML, HREFLANG & HTML'

            let priority = 'P4';

            if(campaignData.current_snapshot.errors.find((iss) => (iss.id == issueId))) priority = 'P0';
            else if(campaignData.current_snapshot.warnings.find((iss) => (iss.id == issueId))) priority = 'P1';
            else if(campaignData.current_snapshot.notices.find((iss) => (iss.id == issueId))) priority = 'P2';

            result.push({
                ...issueObj,
                priority,
                pagesAffected: issuesData[issueId],
            });
        }

        return result;
    }

    async exportIssues(projectId: string) {
        const s3Link = await this.s3Service.getObjectUsingSignedUrl(`projects/serp/${projectId}/issues-csv.csv`)
        return {
            message: "Success",
            link: s3Link
        };
    }

    async exportPages(projectId: string) {
        const s3Link = await this.s3Service.getObjectUsingSignedUrl(`projects/serp/${projectId}/pages-csv.csv`)
        return {
            message: "Success",
            link: s3Link
        };
    }

    async exportCompetitorAnalysis(projectId: string) {
        const s3Link = await this.s3Service.getObjectUsingSignedUrl(`projects/serp/${projectId}/site-audit/2023-07-01_competitor_Analysis.csv`)
        return {
            message: "Success",
            link: s3Link
        };
    }

    async saveFile(filePath: string, obj: string){
        fs.writeFileSync(filePath, obj, 'utf-8');
    }

    async testing(projectId: string) {
        // const data = await this.getIssues(projectId);
        // // const data = await this.getPagesDetails(projectId);
        // const csvData = this.getCSV(data);
        // const path = `projects/serp/${projectId}/issues-csv.csv`;
        // // const res = await this.s3Service.s3_upload(
        // //     csvData,
        // //     process.env.AWS_BUCKET_NAME,
        // //     path,
        // // );

        // const getCampaign = await this.getCampaign(projectId);
        // const domainList = [getCampaign.projectDomain, 'peppercontent.io', 'wittypen.com'];

        // let data = await this.       (projectId, domainList);

        return {
            mssg: "Testing 😄",
            // data: data
        }
    }

    async getApiUnits() {
        try{
            const response = await this.http
              .get(`https://www.semrush.com/users/countapiunits.html?key=${this.SEM_RUSH_API_KEY}`)
              .toPromise();
          
            return response.data;
        }
        catch(err){
            console.log(err)
            throw err;
        }
    }

    async getDashboard(projectId: string) {
        const campaignData = await this.getCampaign(projectId);
        const issueCategoryMap = await this.fetchFileData(`./data/issuesCategoryMapped.json`);

        const issueFreq = campaignData?.defects;

        let freqMap: any = {
            tech: 0,
            crawl: 0,
            broken: 0,
            markup: 0,
        };

        for (const key in issueFreq) {
            const idx = issueCategoryMap.find((issue) => issue.id == parseInt(key));
            if (idx == undefined) continue;

            freqMap[idx["category"]] += issueFreq[key];
        }

        const crawlIssues = freqMap.crawl;
        const brokenIssues = freqMap.broken;
        const markupIssues = freqMap.markup;
        const techIssues = freqMap.tech;
        const totalIssues = campaignData?.errors + campaignData?.warnings + campaignData?.notices;

        const pagesWithIssues = campaignData?.haveIssues;
        const healthyPages = campaignData?.healthy || 0;
        const blockedPages = campaignData?.blocked || 0;
        const crawledPages = campaignData?.pages_crawled || 0;
        const brokenPages = (campaignData?.broken || 0);
        const redirectedPages = (campaignData?.redirected || 0);

        const issuesData = await this.getIssues(projectId);

        return {
            totalIssues,
            crawlIssues,
            markupIssues,
            techIssues,
            brokenIssues,
            pagesWithIssues,    
            healthyPages,
            blockedPages,
            crawledPages,
            brokenPages,
            redirectedPages,
            issuesData,
        }
    }

    async savePagesDetails(projectId: string, type: string, crawlSubdomains: boolean = false) {
        if(!type)   type = '';

        const campaignData = await this.fetchFileData(`./data/${projectId}_campaign_data.json`);
        const reports = await this.fetchFileData(`./data/${projectId}_issues_description.json`);
        const issueCategoryMap = await this.fetchFileData(`./data/issuesCategoryMapped.json`);
        
        let res = [], ans = {} as any;

        for(const issueId in reports){
            for (const rep in reports[issueId].data){
                let obj = reports[issueId].data[rep] as any

                const issueMappedObj = issueCategoryMap.find(issue => (issue.id == issueId))
                
                if(!obj || type != "" && issueMappedObj?.category != type)  continue;
                if(!ans.hasOwnProperty(obj.source_url)) ans[obj.source_url] = []
                let issueReport = {
                    ...obj,
                    data: issueMappedObj,
                }
                ans[obj.source_url].push(issueReport)
            }
        }


        for (const ansKey in ans){
            res.push({
                pageUrl: ansKey,
                issues: ans[ansKey],
            }); 
        }

        // if(crawlSubdomains) fs.writeFileSync(`./data/${projectId}_pages_description_subDomains.json`, JSON.stringify(res, null, 4), 'utf-8');
        // else fs.writeFileSync(`./data/${projectId}_pages_description.json`, JSON.stringify(res, null, 4), 'utf-8');
        fs.writeFileSync(`./data/${projectId}_pages_description.json`, JSON.stringify(res, null, 4), 'utf-8');
    }

    async getPagesDetails(projectId: string, page: number, type?: string) {
        const pagesDetails = await this.fetchFileData(`./data/${projectId}_pages_description.json`);
        if(!pagesDetails)   return [];
        let campaignData = await this.fetchFileData(`./data/${projectId}_campaign_data.json`);

        let result = []
        // let low = page*10, high = Math.min(pagesDetails.length, page*10 + 10);
        let low = 0, high = pagesDetails.length;


        for(let idx = low; idx < high; ++idx){
            let pageObj = pagesDetails[idx]
            let issues = pageObj.issues;
            let categories = [], priorities = [];

            issues.forEach((issue: any) => {
                if(campaignData.current_snapshot.errors.find((iss) => (iss.id == issue.data.id))){
                    priorities.push('P0')
                    categories.push(issue.data.category)
                };
            })

            issues.forEach((issue: any) => {
                if(campaignData.current_snapshot.warnings.find((iss) => (iss.id == issue.data.id))){
                    priorities.push('P1')
                    categories.push(issue.data.category)
                };
            })

            issues.forEach((issue: any) => {
                if(campaignData.current_snapshot.notices.find((iss) => (iss.id == issue.data.id))){
                    priorities.push('P2')
                    categories.push(issue.data.category)
                };
            })

            const groupedCounts = issues.reduce((result, item) => {
                const dataTitle = item.data.title;
              
                if (!result[dataTitle]) {
                  result[dataTitle] = 1;
                } else {
                  result[dataTitle]++;
                }
              
                return result;
            }, {});
              
            // Convert the groupedCounts object to an array of objects with 'key' and 'count'
            const resultArray = Object.keys(groupedCounts).map((key) => ({
                issueTitle: key,
                count: groupedCounts[key],
            }));
              

            result.push({
                pageUrl: pageObj.pageUrl,
                noOfIssues: pageObj.issues.length,
                category: categories,
                priority: priorities,
                issues: resultArray
            })
        }
        
        return result;
    }
}
