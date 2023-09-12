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
} from 'class-validator';

export class GetKeywordsDto {
    @ApiProperty()
    @IsNumber()
    @Transform(({value}) => parseInt(value))
    offset: number;

    @ApiProperty()
    @IsNumber()
    @Transform(({value}) => parseInt(value))
    limit: number;

    @ApiProperty()
    @IsString()
    @IsIn(["all", "shared", "missing", "weak", "untapped", "strong"])
    type: string;
}
