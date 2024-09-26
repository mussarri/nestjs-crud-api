import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDto } from './dto/auth.dto';
import * as argon2 from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}
  async signup(dto: AuthDto) {
    const hash = await argon2.hash(dto.password);
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          hash,
        },
      });
      delete user.hash;
      return this.signtoken(user.id, user.email);
    } catch (error) {
      console.log(error);
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ForbiddenException('Credentials taken');
        }
      }
      throw error;
    }
  }

  async signin(dto: AuthDto) {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          email: dto.email,
        },
      });
      if (!user) {
        throw new ForbiddenException('Credentials incorrect');
      }
      const passwordMatch = await argon2.verify(user.hash, dto.password);

      if (!passwordMatch) {
        throw new ForbiddenException('Credentials incorrect');
      }
      delete user.hash;
      return this.signtoken(user.id, user.email);
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async signtoken(userId: number, email: string) {
    const payload = { sub: userId, email };
    const secret = this.config.get('JWT_SECRET');
    const token = await this.jwt.signAsync(payload, {
      expiresIn: '15m',
      secret: secret,
    });
    return {
      access_token: token,
    };
  }
}
