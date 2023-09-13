import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
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
    @Transform(({value}) => parseInt(value))
    @IsNumber()
    pageLimit?: number;

    @ApiProperty()
    @IsBoolean()
    crawlSubdomains?: boolean;

    @ApiProperty()
    @Transform(({value}) => parseInt(value))
    @IsNumber()
    crawlFrequency?: number;
    
    @ApiProperty()
    @IsString()
    domain: string
}