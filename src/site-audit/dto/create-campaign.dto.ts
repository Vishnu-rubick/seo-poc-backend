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

export class RunAuditDto {
    @ApiProperty()
    @IsString()
    projectId?: string;
}
