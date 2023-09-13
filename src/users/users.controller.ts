import { Body, Controller, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './schemas/user.schema';

@Controller('users')
export class UsersController {

    constructor(
        private usersService: UsersService
    ){}

    @Post()
    async createUser(
        @Body('email') email: string,
        @Body('token') token: string,
    ) {
        const user: User = {
            email: email,
            token: token
        }
        return await this.usersService.createUser(user);
    }

}
