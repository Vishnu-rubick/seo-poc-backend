import { Parser } from '@json2csv/plainjs';
import * as csvjson from 'csvjson';
import { HttpService } from '@nestjs/axios';
import { ForbiddenException, Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catchError, map } from 'rxjs';
import { join } from 'path';

import * as fs from 'fs';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { S3Service } from 'src/utils/s3.service';

@Injectable()
export class SiteAuditService {
    private SEM_RUSH_API_KEY = ''
    private SEM_RUSH_BASE_URL = ''

    constructor(
        private http: HttpService,
        private s3Service: S3Service,
        private configService: ConfigService
    ) {
        this.SEM_RUSH_API_KEY = configService.get('SEM_RUSH_API_KEY');
        this.SEM_RUSH_BASE_URL = configService.get('SEM_RUSH_BASE_URL');
    }

    async runAudit(projectId: string) {
        const runAuditResponse = await this.http.post(`${this.SEM_RUSH_BASE_URL}/reports/v1/projects/${projectId}/siteaudit/launch?key=${this.SEM_RUSH_API_KEY}`).toPromise();
        const snapshotId = runAuditResponse.data.snapshot_id;
        return snapshotId;  
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
        if(!campaignData || campaignData.status != 'FINISHED') {
            campaignData = await this.fetchCampaign(projectId);
            if(campaignData.status == 'FINISHED'){
                isFetchedIssueAndPageDetails = true;
                this.fetchIssueAndPageDetails(projectId, false);
            }
        }
        if(!fs.existsSync(`./data/${projectId}_issues_description.json`) || !isFetchedIssueAndPageDetails){
            // this.fetchIssueAndPageDetails(projectId, false);
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
            console.log('upadte: ', updateCampaignDto);
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

        const snapshotId = data.current_snapshot.snapshot_id;
        const defects = data.defects;
        for(const issueId in defects){
            const limit = defects[issueId];

            const issuesData = await this.fetchIssueDescriptions(projectId, snapshotId, issueId, limit);
            issuesResult[issueId] = issuesData;
        }

        // if(crawlSubdomains) fs.writeFileSync(`./data/${projectId}_issues_description_subDomains.json`, JSON.stringify(issuesResult, null, 2), 'utf-8');
        // else fs.writeFileSync(`./data/${projectId}_issues_description.json`, JSON.stringify(issuesResult, null, 2), 'utf-8');
        fs.writeFileSync(`./data/${projectId}_issues_description.json`, JSON.stringify(issuesResult, null, 2), 'utf-8');

        return issuesResult;
    }

    // Returns an issue Id's List of description with an offset and limit from the file
    async getIssuesDescription(projectId: string, issueId: string, page: number, crawlSubdomains: boolean = false) {
        const issuesDescriptions = await this.fetchFileData(`./data/${projectId}_issues_description.json`);
        if(!issuesDescriptions)   throw new NotFoundException('Unable to Get Issues Descriptions');

        const issuesData = issuesDescriptions[issueId]?.data;
        if(!issuesData) throw new NotFoundException('Unable to Get Issues Descriptions');

        let result = []
        let low = page*10, high = Math.min(issuesData.length, low + 10);

        for(let idx = low; idx < high; ++idx){
            result.push(issuesData[idx])
        }

        // Paginated issues Description
        return result;
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
        await this.saveFile(`./data/${projectId}_${display_date}_competitor_Analysis.json`, JSON.stringify(formattedJson));

        // save in s3
        const csvData = this.getCSV(formattedJson);
        const path = `projects/serp/${projectId}/site-audit/${display_date}_competitor_Analysis.csv`;
        await this.saveFile(`./data/${projectId}_${display_date}_competitor_Analysis.csv`, csvData);
        const res = await this.s3Service.s3_upload(
            csvData,
            process.env.AWS_BUCKET_NAME, 
            path,
        );
        return formattedJson;
    }

    async getCompetitorAnalysis(projectId: string) {
        let competitorData = null;
        let config = await this.fetchFileData(`./data/config.json`);
        if(fs.existsSync(`./data/${projectId}_2023-07-01_competitor_Analysis.json`)) competitorData = await this.fetchFileData(`./data/${projectId}_2023-07-01_competitor_Analysis.json`);

        if(competitorData == null){
            competitorData = await this.fetchCompetitorAnalysis(projectId, [config.domain, ...config.competitors])
        }
        return competitorData;
    }

    getCSV(obj: any) {
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

        // let data = await this.fetchCompetitorAnalysis(projectId, domainList);

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
        const campaignData = await this.fetchFileData(`./data/${projectId}_campaign_data.json`);
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
                console.log(obj)
                console.log(issueId, issueMappedObj?.category, type, issueMappedObj?.category==type)
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

        let result = []
        // let low = page*10, high = Math.min(pagesDetails.length, page*10 + 10);
        let low = 0, high = pagesDetails.length;
        for(let idx = low; idx < high; ++idx){
            result.push({
                pageUrl: pagesDetails[idx].pageUrl,
                noOfIssues: pagesDetails[idx].issues.length,
                category: '--',
                priority: '--',
            })
        }
        
        return result;
    }
}
