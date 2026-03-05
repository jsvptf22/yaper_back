import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Meetup } from 'src/rooms/meetup/meetup.model';
import { User } from 'src/users/user.model';
import { LastTenGamesType, LastTenGamesWinType, WeeklyGamesType } from './lastTenGamesInterface';

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

  async weeklyGames(user: User): Promise<WeeklyGamesType[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // insertMany no dispara pre-save hooks, así que created_at no se persiste.
    // Usamos el timestamp embebido en el ObjectId para filtrar por fecha.
    const cutoffId = new Types.ObjectId(
      Math.floor(sevenDaysAgo.getTime() / 1000).toString(16).padStart(8, '0') +
        '0000000000000000',
    );

    const result = await this.meetupModel.aggregate([
      {
        $match: {
          _id: { $gte: cutoffId },
          users: { $elemMatch: { user_id: user._id } },
        },
      },
      {
        $addFields: {
          date: { $dateToString: { format: '%d/%m', date: { $toDate: '$_id' } } },
          result: {
            $switch: {
              branches: [
                { case: { $eq: ['$winner', null] }, then: 'draw' },
                { case: { $eq: ['$winner._id', user._id] }, then: 'win' },
              ],
              default: 'loss',
            },
          },
        },
      },
      {
        $group: {
          _id: '$date',
          Ganador: { $sum: { $cond: [{ $eq: ['$result', 'win'] }, 1, 0] } },
          Empate: { $sum: { $cond: [{ $eq: ['$result', 'draw'] }, 1, 0] } },
          Perdedor: { $sum: { $cond: [{ $eq: ['$result', 'loss'] }, 1, 0] } },
        },
      },
    ]);

    const dataByDate = new Map<string, WeeklyGamesType>();
    for (const item of result) {
      dataByDate.set(item._id, {
        categoria: item._id,
        Ganador: item.Ganador,
        Empate: item.Empate,
        Perdedor: item.Perdedor,
      });
    }

    const days: WeeklyGamesType[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const key = `${dd}/${mm}`;
      days.push(
        dataByDate.get(key) ?? { categoria: key, Ganador: 0, Empate: 0, Perdedor: 0 },
      );
    }

    return days;
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
