// import { HttpService } from '@nestjs/axios';
// import { Injectable, NotFoundException } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { CommonService } from 'src/utils/common.service';
// import { S3Service } from 'src/utils/s3.service';

// @Injectable()
// export class BacklinksService {
//     private SEM_RUSH_API_KEY = ''
//     private SEM_RUSH_BASE_URL = ''

//     constructor(
//         private http: HttpService,
//         private s3Service: S3Service,
//         private configService: ConfigService,
//         private commonService: CommonService,
//     ) {
//         this.SEM_RUSH_API_KEY = configService.get('SEM_RUSH_API_KEY');
//         this.SEM_RUSH_BASE_URL = configService.get('SEM_RUSH_BASE_URL');
//     }

//     async fetchDomainBacklinks(domain: string, offset: number = 0, limit: number = 50){
//         try {
//             let backlinksData = null;
//             if(this.commonService.isFileExists(`./data/${domain}_backlinks_data.json`))  backlinksData = await this.commonService.fetchFileData(`./data/${domain}_backlinks_data.json`);

//             const objCreatedAt: Date = backlinksData ? new Date(backlinksData.createdAt) : new Date();
//             const currentDate: Date = new Date();

//             const timeDifference: number = currentDate.getTime() - objCreatedAt.getTime();

//             const oneMonthInMilliseconds: number = 30 * 24 * 60 * 60 * 1000;

//             // Check For a month olds data (frequency set as one month for a domain)
//             if (!backlinksData || timeDifference > oneMonthInMilliseconds) {
//                 const apiUrl = `${this.SEM_RUSH_BASE_URL}/analytics/v1/?type=backlinks&target=${domain}&target_type=root_domain&display_offset=${offset}&display_limit=${limit}&export_columns=page_ascore,response_code,source_size,external_num,internal_num,redirect_url,source_url,source_title,image_url,target_url,target_title,anchor,image_alt,last_seen,first_seen,nofollow,form,frame,image,sitewide,newlink,lostlink&key=${this.SEM_RUSH_API_KEY}`;
//                 let csvbacklinksDataResponse = await this.http.get(apiUrl).toPromise();
//                 let csvbacklinksData = csvbacklinksDataResponse.data;

//                 if(!csvbacklinksData || !csvbacklinksData.length)   throw new NotFoundException('No backlinks found with the given limit');

//                 backlinksData = {
//                     createdAt: new Date(),
//                     domain: domain,
//                     total: limit,
//                     data: this.commonService.getJsonFromCSV(csvbacklinksData)
//                 }

//                 await this.commonService.saveFile(`./data/${domain}_backlinks_data.json`, JSON.stringify(backlinksData));
//             }

//             return backlinksData;
//         }
//         catch(err){
//             console.log(err)
//             throw new Error(err);
//         }
//     }

//     async fetchDomainBacklinksOverView(domain: string){
//         try {
//             let overviewData = null;
//             if(this.commonService.isFileExists(`./data/${domain}_backlinks_overview.json`))  overviewData = await this.commonService.fetchFileData(`./data/${domain}_backlinks_overview.json`);

//             const objCreatedAt: Date = overviewData ? new Date(overviewData.createdAt) : new Date();
//             const currentDate: Date = new Date();

//             const timeDifference: number = currentDate.getTime() - objCreatedAt.getTime();

//             const oneMonthInMilliseconds: number = 30 * 24 * 60 * 60 * 1000;

//             // Check For a month olds data (frequency set as one month for a domain)
//             if (!overviewData || timeDifference > oneMonthInMilliseconds) {
//                 const apiUrl = `${this.SEM_RUSH_BASE_URL}/analytics/v1/?target=${domain}&target_type=root_domain&type=backlinks_overview&export_columns=ascore,total,domains_num,urls_num,ips_num,ipclassc_num,follows_num,nofollows_num,sponsored_num,ugc_num,texts_num,images_num,forms_num,frames_num&key=${this.SEM_RUSH_API_KEY}`
//                 let csvOverviewDataResponse = await this.http.get(apiUrl).toPromise();
//                 let csvOverviewData = csvOverviewDataResponse.data;

//                 if(!csvOverviewData || !csvOverviewData.length)   throw new NotFoundException('Something went wrong. Please try again later');

//                 overviewData = {
//                     createdAt: new Date(),
//                     domain: domain,
//                     data: this.commonService.getJsonFromCSV(csvOverviewData)
//                 }

//                 await this.commonService.saveFile(`./data/${domain}_backlinks_overview.json`, JSON.stringify(overviewData));
//             }

//             return overviewData;
//         }
//         catch(err){
//             console.log(err)
//             throw new Error(err);
//         }
        
//     }

//     async fetchBacklinks(userId, projectId: string){
//         const config = await this.commonService.getProject(userId);
//         const domain = config.domain;
//         const commonData = {};

//         const domainOverView = await this.fetchDomainBacklinksOverView(domain);
//         const BacklinkData = await this.fetchDomainBacklinks(domain);

//         return {
//             message: "Success",
//             data: BacklinkData,
//             overview: domainOverView
//         }
//     }

//     async getBacklinks(userId: string, projectId: string, offset: number, limit: number){
//         await this.fetchBacklinks(userId, projectId);
//         const config = await this.commonService.getProject(userId);
//         const domain = config.domain;
//         const backlinksData = await this.commonService.fetchFileData(`./data/${domain}_backlinks_data.json`);

//         if(!backlinksData)   throw new NotFoundException('Something went wrong. Please try again later');

//         const data = backlinksData?.data;
//         let low = offset, high = Math.min(low + 10, data.length), result = [];
//         for(let idx = low; idx < high; ++idx){
//             result.push(data[idx])
//         }

//         return {
//             message: "Success",
//             createdAt: backlinksData.createdAt,
//             data: result,
//         };
//     }

//     async getBacklinksDashboard(userId: string, projectId: string){
//         await this.fetchBacklinks(userId, projectId);
//         const config = await this.commonService.getProject(userId);
//         const domain = config.domain;
//         const backlinksData = await this.commonService.fetchFileData(`./data/${domain}_backlinks_overview.json`);

//         if(!backlinksData)   throw new NotFoundException('Something went wrong. Please try again later');

//         const data = backlinksData?.data;

//         return {
//             message: "Success",
//             createdAt: backlinksData.createdAt,
//             data: data,
//         };
//     }
// }
