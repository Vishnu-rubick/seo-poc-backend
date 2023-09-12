import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { KeywordsService } from './keywords.service';
import { GetKeywordsDto } from './dto/get-keyword.dto';

@Controller('keywords')
export class KeywordsController {
    constructor(
        private readonly keywordsService: KeywordsService
    ){}

    @Get(':projectId/dashboard')
    @ApiOperation({ summary: 'Keywords', description: 'Returns Keywords Summary with competitors' })
    async getKeywordsDashboard(
        @Param('projectId') projectId: string,
    ) {
        if(!projectId)  throw new NotFoundException('project Id cannot be NULL');
        return await this.keywordsService.getKeywordsDashboard(projectId);
    }

    @Get(':projectId')
    @ApiOperation({ summary: 'Keywords', description: 'Fetches Keywords for all the competitors along with root domain' })
    async getKeywords(
        @Param('projectId') projectId: string,
        @Query() query: GetKeywordsDto,
    ) {
        if(!projectId)  throw new NotFoundException('project Id cannot be NULL');
        return await this.keywordsService.getKeywords(projectId, query.type, query.offset, query.limit);
    }
}