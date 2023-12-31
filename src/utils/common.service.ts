import { Injectable, NotFoundException, Req, Res } from '@nestjs/common';
import { Parser } from '@json2csv/plainjs';

import * as fs from 'fs';
import * as csvjson from 'csvjson';
import { InjectModel } from '@nestjs/mongoose';
import { Project, ProjectDocument } from 'src/project/schemas/project.schema';
import { Model } from 'mongoose';
import { ProjectService } from 'src/project/project.service';
import * as url from 'url';

@Injectable()
export class CommonService {
    getCSV(obj: any) {
        if(!obj || obj == "")   return "";
        const parser = new Parser();
        const csv = parser.parse(obj);
        return csv;
    }

    getJsonFromCSV(csvData: any){
        const jsonData = csvjson.toObject(csvData, {
            delimiter: ';',
        });
        return jsonData;
    }

    normalizeDomain(inputUrl: string): string | null {
        // Add "https://" as a default prefix if it's not already there
        if (!inputUrl.startsWith('http://') && !inputUrl.startsWith('https://')) {
          inputUrl = `https://${inputUrl}`;
        }
      
        const parsedUrl = new url.URL(inputUrl);
        let domain = parsedUrl.hostname;
      
        // Remove "www." if it's present at the beginning of the domain
        if (domain.startsWith('www.')) {
          domain = domain.slice(4);
        }
      
        return domain;
      }

    // async getProject(userId: string){
    //     return await this.projectService.getProject(userId);
    // }

    // async getProject(userId: string) {
    //     const config: any = await this.fetchFileData(`./data/config.json`);
    //     if(!config || Object.keys(config).length == 0) throw new NotFoundException('No config data found');

    //     let projectId = null;

    //     const projects = await this.fetchFileData(`./data/projects_data.json`);
    //     if(projects.hasOwnProperty(config?.domain)){
    //         projectId = projects[config?.domain].projectId;
    //     }

    //     return {
    //         ...config,
    //         projectId: projectId
    //     }
    // }

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

    isFileExists(path: string){
        return fs.existsSync(path);
    }
}
