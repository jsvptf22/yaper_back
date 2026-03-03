import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Model, Types } from 'mongoose';
import { EncryptionUtil } from '../utils/encryption.util';
import { User, UserDocument } from './user.model';

@Injectable()
export class UsersService {
  static HOME_USER_ID = new Types.ObjectId('69a617faf7c7240a13d93ae4');
  static MEETUP_BET_SAVER_USER_ID = new Types.ObjectId(
    '69a617faf7c7240a13d93ae5',
  );
  static EARNS_USER_ID = new Types.ObjectId('69a617faf7c7240a13d93ae6');
  static OFFERS_USER_ID = new Types.ObjectId('69a617faf7c7240a13d93ae7');

  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>,
    @Inject('PUB_SUB')
    private pubsub: RedisPubSub,
  ) {}

  async hasBalance(user: User, coins: number): Promise<boolean> {
    const updatedUser = await this.findById(user._id);

    if (!updatedUser || !updatedUser.coins || coins < 0) {
      return false;
    }

    return +updatedUser.coins >= +coins;
  }

  async findById(id: Types.ObjectId): Promise<UserDocument | null> {
    return this.userModel.findById(id);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({
      email,
    });
  }

  async create(
    username: string,
    email: string,
    password: string,
  ): Promise<User> {
    let user = await this.findByEmail(email);

    if (user) {
      throw new Error(`El usuario ${email} ya existe`);
    }

    user = new User();
    user._id = new Types.ObjectId();
    user.name = username;
    user.username = username;
    user.email = email;
    user.coins = 10000;
    user.image = '';
    user.password = EncryptionUtil.encrypt(password);

    await this.userModel.create(user);

    user = await this.findByEmail(email);

    if (!user) {
      throw new Error('Error creando el usario');
    }

    return user;
  }

  async update(id: Types.ObjectId, data: Partial<User>): Promise<User> {
    const user = await this.findById(id);

    if (!user) {
      throw new Error(`El usuario no existe`);
    }

    const { coins, ...safeUpdate } = data;
    await this.userModel.updateOne(
      {
        _id: id,
      },
      {
        $set: safeUpdate,
      },
    );

    const updatedUser = await this.findById(id);
    await this.pubsub.publish('userUpdate', { userUpdate: updatedUser });

    return updatedUser;
  }

  async changeCoin(id: Types.ObjectId, coins: number): Promise<User> {
    await this.userModel.updateOne(
      {
        _id: id,
      },
      {
        $set: {
          coins,
        },
      },
    );

    const updatedUser = await this.findById(id);
    await this.pubsub.publish('userUpdate', { userUpdate: updatedUser });
    return updatedUser;
  }
}
