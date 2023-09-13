// import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
// import { BacklinksService } from './backlinks.service';
// import { ApiOperation } from '@nestjs/swagger';
// import { GetBacklinksDto } from './dto/get-backlinks.dto';

// @Controller('backlinks')
// export class BacklinksController {
//     constructor(
//         private readonly backlinksService: BacklinksService
//     ){}

//     @Get(':projectId/dashboard')
//     @ApiOperation({ summary: 'Backlinks', description: 'Returns Backlinks Summary for configured domain' })
//     async getKeywordsDashboard(
//         @Param('projectId') projectId: string,
//         @Query('userId') userId: string
//     ) {
//         if(!projectId)  throw new NotFoundException('project Id cannot be NULL');
//         return await this.backlinksService.getBacklinksDashboard(userId, projectId);
//     }

//     @Get(':projectId')
//     @ApiOperation({ summary: 'Backlinks', description: 'Fetches Backlinks for the configured domain' })
//     async getBacklinks(
//         @Param('projectId') projectId: string,
//         @Query() query: GetBacklinksDto,
//     ) {
//         if(!projectId)  throw new NotFoundException('project Id cannot be NULL');
//         return await this.backlinksService.getBacklinks(query.userId, projectId, query.offset, query.limit);
//     }
// }
