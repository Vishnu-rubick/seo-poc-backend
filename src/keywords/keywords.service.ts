import { HttpService } from '@nestjs/axios';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Service } from 'src/utils/s3.service';

import * as fs from 'fs';
import { CommonService } from 'src/utils/common.service';
import { ProjectService } from 'src/project/project.service';

@Injectable()
export class KeywordsService {
    private SEM_RUSH_API_KEY = ''
    private SEM_RUSH_BASE_URL = ''

    constructor(
        private http: HttpService,
        private s3Service: S3Service,
        private configService: ConfigService,
        private commonService: CommonService,
    ) {
        this.SEM_RUSH_API_KEY = configService.get('SEM_RUSH_API_KEY');
        this.SEM_RUSH_BASE_URL = configService.get('SEM_RUSH_BASE_URL');
    }

    async fetchDomainKeywords(domain: string, offset: number = 0, limit: number = 100){
        try {
            let keywordsData = null;
            if(this.commonService.isFileExists(`./data/${domain}_keywords_data.json`))  keywordsData = await this.commonService.fetchFileData(`./data/${domain}_keywords_data.json`);

            const objCreatedAt: Date = keywordsData ? new Date(keywordsData.createdAt) : new Date();
            const currentDate: Date = new Date();

            const timeDifference: number = currentDate.getTime() - objCreatedAt.getTime();

            const oneMonthInMilliseconds: number = 30 * 24 * 60 * 60 * 1000;

            // Check For a month olds data (frequency set as one month for a domain)
            if (!keywordsData || timeDifference > oneMonthInMilliseconds) {
                const apiUrl = `${this.SEM_RUSH_BASE_URL}/?type=domain_organic&display_offset=${offset}&display_limit=${limit}&export_columns=Ph,Po,Pp,Pd,Nq,Cp,Ur,Tr,Tg,Tc,Co,Nr,Td,Kd,Fp,Fk,Ts,In,Pt&domain=${domain}&display_sort=tr_desc&database=us&key=${this.SEM_RUSH_API_KEY}`;
                let csvKeywordsDataResponse = await this.http.get(apiUrl).toPromise();
                let csvKeywordsData = csvKeywordsDataResponse.data;

                if(!csvKeywordsData || !csvKeywordsData.length)   throw new NotFoundException('No keywords found with the given limit');

                keywordsData = {
                    createdAt: new Date(),
                    domain: domain,
                    total: limit,
                    data: this.commonService.getJsonFromCSV(csvKeywordsData)
                }

                await this.commonService.saveFile(`./data/${domain}_keywords_data.json`, JSON.stringify(keywordsData));
            }

            return keywordsData;
        }
        catch(err){
            console.log(err)
            throw new Error(err);
        }
    }

    async fetchDomainKeywordsOverView(domain: string){
        try {
            let overviewData = null;
            if(this.commonService.isFileExists(`./data/${domain}_keywords_overview.json`))  overviewData = await this.commonService.fetchFileData(`./data/${domain}_keywords_overview.json`);

            const objCreatedAt: Date = overviewData ? new Date(overviewData.createdAt) : new Date();
            const currentDate: Date = new Date();

            const timeDifference: number = currentDate.getTime() - objCreatedAt.getTime();

            const oneMonthInMilliseconds: number = 30 * 24 * 60 * 60 * 1000;

            // Check For a month olds data (frequency set as one month for a domain)
            if (!overviewData || timeDifference > oneMonthInMilliseconds) {
                const apiUrl = `${this.SEM_RUSH_BASE_URL}/?database=us&type=domain_rank&export_columns=Dn,Rk,Or,Xn,Ot,Oc,Ad,At,Ac,FKn,FPn,Ipu,Ip0,Ip1,Ip2,Ip3,Itu,It0,It1,It2,It3,Icu,Ic0,Ic1,Ic2,Ic3,Sr,Srb,St,Stb,Sc,Srn,Srl&domain=${domain}&key=${this.SEM_RUSH_API_KEY}`
                let csvOverviewDataResponse = await this.http.get(apiUrl).toPromise();
                let csvOverviewData = csvOverviewDataResponse.data;

                if(!csvOverviewData || !csvOverviewData.length)   throw new NotFoundException('Something went wrong. Please try again later');

                overviewData = {
                    createdAt: new Date(),
                    domain: domain,
                    data: this.commonService.getJsonFromCSV(csvOverviewData)
                }

                await this.commonService.saveFile(`./data/${domain}_keywords_overview.json`, JSON.stringify(overviewData));
            }

            return overviewData;
        }
        catch(err){
            console.log(err)
            throw new Error(err);
        }
        
    }

    async fetchKeywords(projectId: string){
        const config = await this.commonService.getConfig();
        const competitors = [config.domain, ...config.competitors];
        const commonData = {};

        await Promise.all(competitors.map(async (domain) => {
            const domainOverView = await this.fetchDomainKeywordsOverView(domain);
            const keywordsData = await this.fetchDomainKeywords(domain);
        }));

        await Promise.all(competitors.map(async (domain) => {
            const keywordsData = await this.commonService.fetchFileData(`./data/${domain}_keywords_data.json`);

            keywordsData.data.forEach((keyWordData: any) => {
                let keyword = keyWordData['Keyword'], keywordDifficulty = keyWordData['Keyword Difficulty'], searchVolume = keyWordData['Search Volume']

                if(!commonData.hasOwnProperty(keyword)){
                    commonData[keyword] = {
                        keywordDifficulty: keywordDifficulty,
                        searchVolume: searchVolume
                    }
                    competitors.forEach((competitor) => {
                        commonData[keyword][competitor] = false
                    })
                }
                commonData[keyword][domain] = true
            });
        }));

        await this.commonService.saveFile(`./data/${projectId}_common_data.json`, JSON.stringify(commonData))
        return {
            message: "Success",
            data: commonData
        }
    }

    async getKeywordsDashboard(projectId: string) {
        const commonData = await this.commonService.fetchFileData(`./data/${projectId}_common_data.json`);
        const allKeywords = await this.getAllKeywords(commonData);
        const sharedKeywords = await this.getSharedKeywords(commonData);
        const missingKeywords = await this.getMissingKeywords(commonData);
        const weakKeywords = await this.getWeakKeywords(commonData);
        const untappedKeywords = await this.getUntappedKeywords(commonData);
        const strongKeywords = await this.getStrongKeywords(commonData);
        let chartObj = {};

        const config = await this.commonService.getConfig();
        const domains = [config.domain, ...config.competitors];

        await this.getChartObj(projectId, 0, "", domains, chartObj);

        return {
            message: "Success",
            data: {
                allKeywords: allKeywords.length,
                sharedKeywords: sharedKeywords.length,
                missingKeywords: missingKeywords.length,
                weakKeywords: weakKeywords.length,
                untappedKeywords: untappedKeywords.length,
                strongKeywords: strongKeywords.length,
                chartObj: chartObj
            }
        }
    }

    async getCommonCount(projectId: string, domains: string[]){
        let res = 0;
        const data = await this.commonService.fetchFileData(`./data/${projectId}_common_data.json`);

        for (let key of Object.keys(data)) {
            let obj = data[key], fg = true;
            for(let domain of domains){
                if(!data[key][domain]){
                    fg = false;
                    break;
                }
            }
            if(!fg) continue;
            else res++;
        }

        return res;
    }

    async getChartObj(projectId: string, idx: number, key: string, domains: string[], chartObj: any){
        if(idx == domains.length){
            if(!key.length) return;
            key = key.slice(1);
            let domains = key.split('_');
            chartObj[key] = await this.getCommonCount(projectId, domains);
            return;
        }
        let temp = key;
        key = key + `_${domains[idx]}`
        this.getChartObj(projectId, idx+1, key, domains, chartObj);
        key = temp;
        this.getChartObj(projectId, idx+1, key, domains, chartObj);
    }

    async getKeywords(projectId: string, type: string = "all", offset: number = 0, limit: number = 10){
        await this.fetchKeywords(projectId);
        const commonData = await this.commonService.fetchFileData(`./data/${projectId}_common_data.json`);

        let data = [];
        if(type == "all"){
            data = await this.getAllKeywords(commonData);
        }
        else if(type == "shared"){
            data = await this.getSharedKeywords(commonData);
        }
        else if(type == "missing"){
            data = await this.getMissingKeywords(commonData);
        }
        else if(type == "weak"){
            data = await this.getWeakKeywords(commonData);
        }
        else if(type == "untapped"){
            data = await this.getUntappedKeywords(commonData);
        }
        else if(type == "strong"){
            data = await this.getStrongKeywords(commonData);
        }

        
        let low = offset, high = Math.min(low + 10, data.length), result = [];
        for(let idx = low; idx < high; ++idx){
            result.push(data[idx])
        }

        let count = {}, config = await this.commonService.fetchFileData(`./data/config.json`);
        let competitors = [config.domain, ...config.competitors]

        competitors.forEach((domain) => {
            count[domain] = 0;
        })

        competitors.forEach((domain) => {
            data.forEach(x => {
                if(x[domain])   count[domain]++;
            })
        })

        return {
            message: "Success",
            total: data.length,
            data: result,
            count: count
        }
    }

    async getAllKeywords(data: any){
        let res = [];
      
        for (let key of Object.keys(data)) {
          let obj = data[key];
          res.push({
            name: key,
            ...obj
          });
        }
      
        return res;
    };

    async getSharedKeywords(data: any){
        let res = [];
        const config = await this.commonService.getConfig();
        const competitors = await config.competitors
        const domain = await config.domain
      
        for (let key of Object.keys(data)) {
          let obj = data[key];
          let presentInAll = true;

          competitors.forEach((competitor) => {
            presentInAll = presentInAll && obj[competitor]
          })
      
          if (obj[domain] && presentInAll) {
            res.push({
                name: key,
                ...obj
            });
          }
        }
      
        return res;
    };

    async getMissingKeywords(data: any){
        let res = [];
        const config = await this.commonService.getConfig();
        const competitors = await config.competitors
        const domain = await config.domain
      
        for (let key of Object.keys(data)) {
          let obj = data[key];
          let presentInAll = true;

          competitors.forEach((competitor) => {
            presentInAll = presentInAll && obj[competitor]
          })
      
          if (!obj[domain] && presentInAll) {
            res.push({
                name: key,
                ...obj
            });
          }
        }
      
        return res;
    };

    async getWeakKeywords(data: any){
        let res = [];
        const config = await this.commonService.getConfig();
        const competitors = await config.competitors
        const domain = await config.domain
      
        for (let key of Object.keys(data)) {
            let obj = data[key];
            let presentInAll: boolean = true, compPosition = 0;
            let rootKeywordsData = await this.commonService.fetchFileData(`./data/${domain}_keywords_data.json`);
            rootKeywordsData = rootKeywordsData.data
            let rootPos = rootKeywordsData.find((elem) => (elem["Keyword"] == domain));
            if(!rootPos)    continue;
            rootPos = parseInt(rootPos['Position'])

            competitors.forEach(async (competitor) => {
                presentInAll = presentInAll && obj[competitor]

                if(obj[competitor]){
                    let competitorKeywordsData = await this.commonService.fetchFileData(`./data/${competitor}_keywords_data.json`);
                    competitorKeywordsData = competitorKeywordsData.data;
                    let position = competitorKeywordsData.find((elem) => (elem["Keyword"] == competitor));
                    if(position)    position = parseInt(position['Position'])
                    if(position)    compPosition = Math.max(compPosition, position)
                }
            })
        
            if (!obj[domain] || !presentInAll)    continue;

            if(rootPos > compPosition){
                res.push({
                    name: key,
                    ...obj
                });
            }
        }
      
        return res;
    };

    async getUntappedKeywords(data: any){
        let res = [];
        const config = await this.commonService.getConfig();
        const competitors = await config.competitors
        const domain = await config.domain
      
        for (let key of Object.keys(data)) {
            let obj = data[key];
            let presentInAll: boolean = true, compTraffic = 0;

            let rootKeywordsData = await this.commonService.fetchFileData(`./data/${domain}_keywords_data.json`);
            rootKeywordsData = rootKeywordsData.data
            let rootTraffic = rootKeywordsData.find((elem) => (elem["Keyword"] == domain));
            if(!rootTraffic)    rootTraffic = 0;
            rootTraffic = parseInt(rootTraffic['Traffic'])

            competitors.forEach(async (competitor) => {
                presentInAll = presentInAll && obj[competitor]

                if(obj[competitor]){
                    let competitorKeywordsData = await this.commonService.fetchFileData(`./data/${competitor}_keywords_data.json`);
                    competitorKeywordsData = competitorKeywordsData.data;
                    let traffic = competitorKeywordsData.find((elem) => (elem["Keyword"] == competitor));
                    if(traffic)    traffic = parseInt(traffic['Traffic'])
                    if(traffic)    compTraffic = Math.max(compTraffic, traffic)
                }
            })
        
            if(compTraffic > rootTraffic){
                res.push({
                    name: key,
                    ...obj
                });
            }
        }
      
        return res;
    };

    async getStrongKeywords(data: any){
        let res = [];
        const config = await this.commonService.getConfig();
        const competitors = await config.competitors
        const domain = await config.domain
      
        for (let key of Object.keys(data)) {
            let obj = data[key];
            let presentInAll: boolean = true, compTraffic = 0;

            let rootKeywordsData = await this.commonService.fetchFileData(`./data/${domain}_keywords_data.json`);
            rootKeywordsData = rootKeywordsData.data
            let rootTraffic = rootKeywordsData.find((elem) => (elem["Keyword"] == domain));
            if(!rootTraffic)    rootTraffic = 0;
            rootTraffic = parseInt(rootTraffic['Traffic'])

            competitors.forEach(async (competitor) => {
                presentInAll = presentInAll && obj[competitor]

                if(obj[competitor]){
                    let competitorKeywordsData = await this.commonService.fetchFileData(`./data/${competitor}_keywords_data.json`);
                    competitorKeywordsData = competitorKeywordsData.data;
                    let traffic = competitorKeywordsData.find((elem) => (elem["Keyword"] == competitor));
                    if(traffic)    traffic = parseInt(traffic['Traffic'])
                    if(traffic)    compTraffic = Math.max(compTraffic, traffic)
                }
            })
        
            if(rootTraffic > compTraffic){
                res.push({
                    name: key,
                    ...obj
                });
            }
        }
      
        return res;
    };

}
