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

export class UpdateCampaignDto {
    @ApiProperty()
    @IsString()
    domain: string;
    
    @ApiProperty()
    @IsNumber()
    scheduleDay?: number;

    @ApiProperty()
    @IsBoolean()
    notify?: boolean;

    @ApiProperty()
    @IsNumber()
    pageLimit: number;

    @ApiProperty()
    @IsNumber()
    crawlSubdomains?: boolean;
}