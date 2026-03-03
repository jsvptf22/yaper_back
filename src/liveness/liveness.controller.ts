import { Controller, Get } from '@nestjs/common';
import { Public } from 'src/auth/public.decorator';

@Controller()
export class LivenessController {
  @Public()
  @Get('/')
  liveness() {
    return 'OK';
  }
}
