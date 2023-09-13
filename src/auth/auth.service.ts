import { Injectable, NotFoundException, UnauthorizedException  } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ) {}

    async createToken(): Promise<string> {
        const payload = { password: 'seo-module' };
        return this.jwtService.sign(payload, {
            secret: 'seo-secreet'
        });
    }

    async validateUser(email: string, password: string): Promise<any> {
        const user = await this.usersService.findOne({email: email});
        if (!user) {
            throw new NotFoundException('No such user found');
        }

        const token: string = user?.token;

        const decodedToken: any = this.jwtService.decode(token);
    
        if (password !== decodedToken.password) {
          throw new UnauthorizedException('Invalid password');
        }
        return { user };
    }

    async loginUser(email: string, password: string): Promise<void> {
        const isValid = await this.validateUser(email, password);
        if (!isValid) {
          throw new UnauthorizedException('Invalid token');
        }
    }
}
