import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}

    @Post('login')
    async login(
        @Body('email') email: string,
        @Body('password') password: string,
    ): Promise<{ user: any; token: string }> {
        const { user, token } = await this.authService.validateUser(email, password);
        return { user, token };
    }

    @Get()
    async createToken(){
        return await this.authService.createToken();
    }
}
