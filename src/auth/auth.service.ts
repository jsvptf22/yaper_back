import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SignInResponse } from '../common/auth/signInResponse';
import { User } from '../users/user.model';
import { UsersService } from '../users/users.service';
import { EncryptionUtil } from '../utils/encryption.util';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async signIn(username: string, password: string): Promise<SignInResponse> {
    const user: User | undefined = await this.usersService.findByEmail(
      username,
    );
    if (!user || EncryptionUtil.encrypt(password) !== user.password) {
      throw new Error('invalid credentials');
    }

    return {
      token: this.generateToken(user),
      user,
    };
  }

  async signUp(
    username: string,
    email: string,
    password: string,
  ): Promise<SignInResponse> {
    const user: User = await this.usersService.create(
      username,
      email,
      password,
    );

    return {
      token: this.generateToken(user),
      user,
    };
  }

  private generateToken(user: User): string {
    const payload = {
      sub: user._id,
      _id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
    };
    return this.jwtService.sign(payload);
  }
}
