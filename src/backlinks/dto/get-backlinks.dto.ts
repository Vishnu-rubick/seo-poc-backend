import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    IsOptional,
    IsString,
    IsDate,
    ArrayMinSize,
    IsNumber,
    ValidateNested,
    isArray,
    IsIn,
    IsNotEmpty,
} from 'class-validator';

export class GetBacklinksDto {
    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    @Transform(({value}) => parseInt(value))
    offset: number;

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    @Transform(({value}) => parseInt(value))
    limit: number;
}
