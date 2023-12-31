import { ApiProperty } from '@nestjs/swagger';
import {
    IsOptional,
    IsString,
    IsDate,
    ArrayMinSize,
    IsNumber,
    ValidateNested,
    isArray,
    IsBoolean,
} from 'class-validator';

export class SetupDto {
    @ApiProperty()
    @IsString()
    domain: string;

    @ApiProperty()
    @IsNumber()
    pageLimit: number;

    @ApiProperty()
    @IsBoolean()
    crawlsubdomains?: boolean;
}
