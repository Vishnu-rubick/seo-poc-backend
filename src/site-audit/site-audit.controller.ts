import { BadRequestException, Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { RunAuditDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { QueryObj } from './interface';
import { SiteAuditService } from './site-audit.service';

@Controller('site-audit')
export class SiteAuditController {

    constructor(
        private readonly siteAuditService: SiteAuditService
    ){}

    @Get('/testing')
    async testing(
        @Query('projectId') projectId: string,
    ) {
        return await this.siteAuditService.testing(projectId);
    }

    // postman
    @Post('/enable')
    async enableSiteAudit(
        @Body() runAuditDto: RunAuditDto,
    ) {
        return await this.siteAuditService.enableAudit(runAuditDto.projectId);
    }

    // postman
    @Post('/run')
    async runAudit(
        @Body() runAuditDto: RunAuditDto,
    ) {
        return await this.siteAuditService.runAudit(runAuditDto.projectId);
    }

    @Get('/competitorAnalysis/:projectId')
    async getCompetitorAnalysis(
        @Param('projectId') projectId: string,
    ) {
        return await this.siteAuditService.getCompetitorAnalysis(projectId);
    }

    @Get('/competitorAnalysis/:projectId/export')
    async exportCompetitorAnalysis(
        @Param('projectId') projectId: string,
    ) {
        return await this.siteAuditService.exportCompetitorAnalysis(projectId);
    }

    // --
    @Get('/campaign/:projectId')
    async getCampaign(
        @Param('projectId') projectId: string,
        @Query('crawlSubdomains') crawlSubdomains: boolean
    ) {
        return await this.siteAuditService.getCampaign(projectId, crawlSubdomains);
    }

    // -- hard FE
    @Put('/campaign/:projectId')
    async updateCampaign(
        @Param('projectId') projectId: string,
        @Body() updateCampaignDto: UpdateCampaignDto
    ) {
        return await this.siteAuditService.updateCampaign(projectId, updateCampaignDto);
    }

    // FE
    @Get('/campaign/:projectId/issues')
    async getCampaignIssues(
        @Param('projectId') projectId: string,
    ) {
        if(!projectId)  throw new BadRequestException('Invalid Project Id')
        return await this.siteAuditService.getIssues(projectId);
    }

    // FE
    @Get('/campaign/:projectId/issues/:issueId')
    async getCampaignIssueDescription(
        @Param('projectId') projectId: string,
        @Param('issueId') issueId: string,
        @Query('page') page: string
    ) {
        return await this.siteAuditService.getIssuesDescription(projectId, issueId, parseInt(page));
    }

    @Get('/campaign/:projectId/export/issues')
    async exportIssues(
        @Param('projectId') projectId: string,
    ) {
        return await this.siteAuditService.exportIssues(projectId);
    }

    @Get('/campaign/:projectId/export/pages')
    async exportPages(
        @Param('projectId') projectId: string,
    ) {
        return await this.siteAuditService.exportPages(projectId);
    }

    @Get('/dashboard/:projectId')
    async getDashboard(
        @Param('projectId') projectId: string,
    ) {
        return await this.siteAuditService.getDashboard(projectId);
    }

    @Get('/fetch/campaign/:projectId/issues')
    async fetchCampaignIssuesDescriptions(
        @Param('projectId') projectId: string,
    ) {
        if(!projectId)  throw new BadRequestException('Invalid Project Id')
        return await this.siteAuditService.fetchIssuesDescription(projectId);
    }

    @Get('/campaign/:projectId/pages')
    async getPages(
        @Param('projectId') projectId: string,
        @Query('page') page: string,
        @Query('type') type: string
    ) {
        if(!projectId)  throw new BadRequestException('Invalid Project Id')
        if(!page)  throw new BadRequestException('Page is mandatory')
        // return await this.siteAuditService.savePagesDetails(projectId, type);
        return await this.siteAuditService.getPagesDetails(projectId, parseInt(page), type);
    }

    // FE -- if needed
    @Get('/UnitsCount')
    async getApiUnits() {
        return this.siteAuditService.getApiUnits();
    }
}
