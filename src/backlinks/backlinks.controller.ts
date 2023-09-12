import { Controller } from '@nestjs/common';
import { BacklinksService } from './backlinks.service';

@Controller('backlinks')
export class BacklinksController {
    constructor(
        private readonly backlinksService: BacklinksService
    ){}
}
