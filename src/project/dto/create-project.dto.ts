import { ApiProperty } from '@nestjs/swagger';
import {
    IsOptional,
    IsString,
    IsDate,
    IsArray,
    ArrayMinSize,
    IsNumber,
    ValidateNested,
    IsBoolean,
} from 'class-validator';
import { DomainInfoType } from '../schemas/project.schema';
import { Types } from 'mongoose';

export class CreateProjectDto {
    @ApiProperty()
    @IsString()
    user_id: Types.ObjectId;

    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty()
    @IsNumber()
    crawl_frequency?: number;

    @ApiProperty()
    @IsNumber()
    crawl_limit?: number;

    @ApiProperty()
    @IsBoolean()
    is_exclude_subdomains?: boolean;

    @ApiProperty()
    @IsString()
    domain: string;

    @ApiProperty()
    @IsArray()
    competitors: string[];

    @ApiProperty()
    @IsOptional()
    @IsString()
    semProjectId?: string;

    @ApiProperty()
    @IsString()
    updated_by: Types.ObjectId

    @ApiProperty()
    industry_id: string;

    @ApiProperty()
    geography_id: string;

    @ApiProperty()
    @IsOptional()
    snapshot_id?: string;
}
