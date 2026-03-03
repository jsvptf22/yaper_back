import { Body, Controller, Post } from '@nestjs/common';
import { SignInResponse } from '../common/auth/signInResponse';
import { SignUpResponse } from '../common/auth/signUpResponse';
import {
  IResponse,
  RESPONSE_STATUS,
  Response,
} from '../common/response/Response';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('signin')
  async signin(
    @Body('email') email: string,
    @Body('password') password: string,
  ): Promise<IResponse<SignInResponse>> {
    const response = new Response<SignInResponse>();

    try {
      const signInResponse = await this.authService.signIn(email, password);
      response.setData(signInResponse);
      response.setStatus(RESPONSE_STATUS.SUCCESS);
    } catch (error) {
      response.setMessage(error.message);
    } finally {
      return response.getResponse();
    }
  }

  @Public()
  @Post('signup')
  async signup(
    @Body('name') name: string,
    @Body('email') email: string,
    @Body('password') password: string,
  ): Promise<IResponse<SignUpResponse>> {
    const response = new Response<SignUpResponse>();

    try {
      const signUpResponse = await this.authService.signUp(
        name,
        email,
        password,
      );
      response.setData(signUpResponse);
      response.setStatus(RESPONSE_STATUS.SUCCESS);
    } catch (error) {
      response.setMessage(error.message);
    } finally {
      return response.getResponse();
    }
  }
}
