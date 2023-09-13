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

export class RunAuditDto {
    @ApiProperty()
    @IsString()
    projectId?: string;

    @ApiProperty()
    @IsNumber()
    pageLimit?: number;

    @ApiProperty()
    @IsBoolean()
    crawlSubdomains?: boolean;

    @ApiProperty()
    @IsBoolean()
    crawlFrequency?: number;
    
    @ApiProperty()
    @IsString()
    domain: string
}