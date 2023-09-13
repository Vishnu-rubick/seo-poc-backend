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

export class UpdateProjectDto {
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
    @IsArray()
    competitors?: string[];

    @ApiProperty()
    @IsString()
    semProjectId?: string;
    
    @ApiProperty()
    @IsString()
    updated_by: Types.ObjectId;
}
