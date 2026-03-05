import { Controller, Get, Request } from '@nestjs/common';
import {
  IResponse,
  RESPONSE_STATUS,
  Response,
} from 'src/common/response/Response';
import { DashboardService } from './dashboard.service';
import { LastTenGamesType, WeeklyGamesType } from './lastTenGamesInterface';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('earnings')
  async totalEarnings(@Request() req): Promise<IResponse<number>> {
    const response = new Response<number>();

    try {
      const user = req.user;
      const earnings = await this.dashboardService.totalEarnings(user);

      response.setData(earnings);
      response.setStatus(RESPONSE_STATUS.SUCCESS);
    } catch (error) {
      response.setMessage(error.message);
    } finally {
      return response.getResponse();
    }
  }

  @Get('games')
  async totalGames(@Request() req): Promise<IResponse<number>> {
    const response = new Response<number>();

    try {
      const user = req.user;
      const games = await this.dashboardService.totalGames(user);

      response.setData(games);
      response.setStatus(RESPONSE_STATUS.SUCCESS);
    } catch (error) {
      response.setMessage(error.message);
    } finally {
      return response.getResponse();
    }
  }

  @Get('weeklyGames')
  async weeklyGames(@Request() req): Promise<IResponse<WeeklyGamesType[]>> {
    const response = new Response<WeeklyGamesType[]>();

    try {
      const user = req.user;
      const data = await this.dashboardService.weeklyGames(user);

      response.setData(data);
      response.setStatus(RESPONSE_STATUS.SUCCESS);
    } catch (error) {
      response.setMessage(error.message);
    } finally {
      return response.getResponse();
    }
  }

  @Get('lastTenGames')
  async lastTenGames(@Request() req): Promise<IResponse<LastTenGamesType[]>> {
    const response = new Response<LastTenGamesType[]>();

    try {
      const user = req.user;
      const games = await this.dashboardService.lastTenGames(user);

      response.setData(games);
      response.setStatus(RESPONSE_STATUS.SUCCESS);
    } catch (error) {
      response.setMessage(error.message);
    } finally {
      return response.getResponse();
    }
  }
}
