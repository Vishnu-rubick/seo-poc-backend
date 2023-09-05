import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Put, Query } from '@nestjs/common';
import { RunAuditDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { QueryObj } from './interface';
import { SiteAuditService } from './site-audit.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller('site-audit')
@ApiTags('Site-Audit')
export class SiteAuditController {
    constructor(
        private readonly siteAuditService: SiteAuditService
    ){}

    // @Get('/testing')
    // async testing(
    //     @Query('projectId') projectId: string,
    // ) {
    //     return await this.siteAuditService.testing(projectId);
    // }

    // postman
    @Post('/enable')
    @ApiOperation({ summary: 'Enable Audit tool in semrush', description: 'Enables the Audit tool for the Project' })
    async enableSiteAudit(
        @Body() runAuditDto: RunAuditDto,
    ) {
        return await this.siteAuditService.enableAudit(runAuditDto.projectId);
    }

    // postman
    @Post('/run')
    @ApiOperation({ summary: 'Runs the Audit', description: 'Starts running the audit for the input project Id' })
    async runAudit(
        @Body() runAuditDto: RunAuditDto,
    ) {
        return await this.siteAuditService.runAudit(runAuditDto.projectId, runAuditDto.domain, runAuditDto.pageLimit, runAuditDto.crawlSubdomains);
    }

    @Get('/competitorAnalysis/:projectId')
    @ApiOperation({ summary: 'Competitor Analysis', description: 'Returns competitor Analysis data' })
    async getCompetitorAnalysis(
        @Param('projectId') projectId: string,
    ) {
        if(!projectId)  throw new NotFoundException('project Id cannot be NULL');
        return await this.siteAuditService.getCompetitorAnalysis(projectId);
    }

    @Get('/competitorAnalysis/:projectId/export')
    @ApiOperation({ summary: 'Export competitor Analysis', description: 'Returns signed s3 Link with a 5 in access with competitor analysis Data' })
    async exportCompetitorAnalysis(
        @Param('projectId') projectId: string,
    ) {
        if(!projectId)  throw new NotFoundException('project Id cannot be NULL');
        return await this.siteAuditService.exportCompetitorAnalysis(projectId);
    }

    // --
    @Get('/campaign/:projectId')
    @ApiOperation({ summary: 'Get Campaign', description: 'Returns last Audits Report' })
    async getCampaign(
        @Param('projectId') projectId: string,
        @Query('crawlSubdomains') crawlSubdomains: boolean
    ) {
        if(!projectId)  throw new NotFoundException('project Id cannot be NULL');
        return await this.siteAuditService.getCampaign(projectId, crawlSubdomains);
    }

    // -- hard FE
    // @Put('/campaign/:projectId')
    // async updateCampaign(
    //     @Param('projectId') projectId: string,
    //     @Body() updateCampaignDto: UpdateCampaignDto
    // ) {
    //     return await this.siteAuditService.updateCampaign(projectId, updateCampaignDto);
    // }

    // FE
    @Get('/campaign/:projectId/issues')
    @ApiOperation({ summary: 'Get Issues', description: 'Returns last Audits list of issues' })
    async getCampaignIssues(
        @Param('projectId') projectId: string,
    ) {
        if(!projectId)  throw new NotFoundException('project Id cannot be NULL');
        return await this.siteAuditService.getIssues(projectId);
    }

    // FE
    @Get('/campaign/:projectId/issues/:issueId')
    @ApiOperation({ summary: 'Get Issue Descriptions', description: 'Returns the occurences of issue id from the last Audit' })
    async getCampaignIssueDescription(
        @Param('projectId') projectId: string,
        @Param('issueId') issueId: string,
        @Query('page') page: string
    ) {
        if(!projectId)  throw new NotFoundException('project Id cannot be NULL');
        return await this.siteAuditService.getIssuesDescription(projectId, issueId, parseInt(page));
    }

    @Get('/campaign/:projectId/export/issues')
    @ApiOperation({ summary: 'Export Issues', description: 'Returns signed s3 Link with a 5 in access with Issues Data' })
    async exportIssues(
        @Param('projectId') projectId: string,
    ) {
        if(!projectId)  throw new NotFoundException('project Id cannot be NULL');
        return await this.siteAuditService.exportIssues(projectId);
    }

    @Get('/campaign/:projectId/export/pages')
    @ApiOperation({ summary: 'Export Pages', description: 'Returns signed s3 Link with a 5 in access with Pages Data' })
    async exportPages(
        @Param('projectId') projectId: string,
    ) {
        if(!projectId)  throw new NotFoundException('project Id cannot be NULL');
        return await this.siteAuditService.exportPages(projectId);
    }

    @Get('/dashboard/:projectId')
    @ApiOperation({ summary: 'Get Dashboard', description: 'Returns Dashboard Data for SEO' })
    async getDashboard(
        @Param('projectId') projectId: string,
    ) {
        if(!projectId)  throw new NotFoundException('project Id cannot be NULL');
        return await this.siteAuditService.getDashboard(projectId);
    }

    @Get('/fetch/campaign/:projectId/issues')
    async fetchCampaignIssuesDescriptions(
        @Param('projectId') projectId: string,
    ) {
        if(!projectId)  throw new NotFoundException('project Id cannot be NULL');
        return await this.siteAuditService.fetchIssuesDescription(projectId);
    }

    @Get('/campaign/:projectId/pages')
    @ApiOperation({ summary: 'Get Pages', description: 'Returns last Audits list of Pages' })
    async getPages(
        @Param('projectId') projectId: string,
        @Query('page') page: string,
        @Query('type') type: string
    ) {
        if(!projectId)  throw new NotFoundException('project Id cannot be NULL');
        if(!page)  throw new BadRequestException('Page is mandatory')
        // return await this.siteAuditService.savePagesDetails(projectId, type);
        return await this.siteAuditService.getPagesDetails(projectId, parseInt(page), type);
    }

    // FE -- if needed
    @Get('/UnitsCount')
    @ApiOperation({ summary: 'Get SemRush API Units', description: 'Returns API Units left in SEM RUSH' })
    async getApiUnits() {
        return this.siteAuditService.getApiUnits();
    }
}
