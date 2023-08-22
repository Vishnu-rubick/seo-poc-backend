import { ApiProperty } from '@nestjs/swagger';
import {
    IsOptional,
    IsString,
    IsDate,
    IsArray,
    ArrayMinSize,
    IsNumber,
    ValidateNested,
} from 'class-validator';

export class CreateProjectDto {
    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty()
    @IsString()
    domainUrl: string;
}
