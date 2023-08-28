import { ApiProperty } from '@nestjs/swagger';
import {
    IsOptional,
    IsString,
    IsDate,
    ArrayMinSize,
    IsNumber,
    ValidateNested,
    isArray,
} from 'class-validator';

export class ConfigDto {
    @ApiProperty()
    @IsString()
    domain: string;

    @ApiProperty()
    @IsString()
    industry: string;

    @ApiProperty()
    @IsString()
    geography: string;

    @ApiProperty()
    competitors: string[];
}
