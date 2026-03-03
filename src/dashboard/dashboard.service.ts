import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Meetup } from 'src/rooms/meetup/meetup.model';
import { User } from 'src/users/user.model';
import { LastTenGamesType, LastTenGamesWinType } from './lastTenGamesInterface';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Meetup.name) private readonly meetupModel: Model<Meetup>,
  ) {}

  async totalEarnings(user: User): Promise<number> {
    const result = await this.meetupModel.aggregate([
      {
        $match: {
          'winner._id': user._id,
        },
      },
      { $group: { _id: null, total: { $sum: '$game.bet' } } },
    ]);

    if (result.length === 0) {
      return 0;
    }

    return result[0].total;
  }

  async totalGames(user: User): Promise<number> {
    const result = await this.meetupModel.aggregate([
      {
        $match: {
          users: { $elemMatch: { user_id: user._id } },
        },
      },
      { $count: 'total' },
    ]);

    if (result.length === 0) {
      return 0;
    }

    return result[0].total;
  }

  async lastTenGames(user: User): Promise<LastTenGamesType[]> {
    const result = await this.meetupModel.aggregate([
      {
        $match: {
          users: { $elemMatch: { user_id: user._id } },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 1,
          winner: 1,
          'game.bet': 1,
          'game.name': 1,
        },
      },
    ]);

    const converted = result.map((item) => {
      let win: LastTenGamesWinType = LastTenGamesWinType.EQUAL;

      if (item.winner) {
        win =
          item.winner._id.toString() === user._id.toString()
            ? LastTenGamesWinType.WIN
            : LastTenGamesWinType.LOSE;
      }

      return {
        id: item._id,
        name: item.game.name,
        bet: item.game.bet,
        win: win,
      };
    });

    return converted;
  }
}
