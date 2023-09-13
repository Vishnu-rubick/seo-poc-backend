import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from 'src/users/users.module';
import { UsersService } from 'src/users/users.service';
import { JwtModule, JwtService } from '@nestjs/jwt';

@Module({
  imports: [UsersModule,
    JwtModule.register({
      secret: 'seo-secreet', // Replace with a valid secret key
      signOptions: { expiresIn: '365d' },
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtService],
  exports: [AuthService, JwtModule]
})
export class AuthModule {}
