import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../user.model';
import { UserBankAccount } from './user-bank-account.model';

@Injectable()
export class UserBankAccountService {
  constructor(
    @InjectModel(UserBankAccount.name)
    private userBankAccountModel: Model<UserBankAccount>,
  ) {}

  async findByUser(user: User): Promise<UserBankAccount[]> {
    return await this.userBankAccountModel.find({
      user_id: user._id,
      active: true,
    });
  }

  async findById(user: User, accountId: string): Promise<UserBankAccount> {
    return await this.userBankAccountModel.findOne({
      user_id: user._id,
      active: true,
      _id: new Types.ObjectId(accountId),
    });
  }

  async create(
    user: User,
    data: Partial<UserBankAccount>,
  ): Promise<UserBankAccount> {
    const userBankAccount = new UserBankAccount();
    userBankAccount._id = new Types.ObjectId();
    userBankAccount.user_id = user._id;
    userBankAccount.customName = data.customName;
    userBankAccount.type = data.type;
    userBankAccount.number = data.number;
    userBankAccount.bankName = data.bankName;
    userBankAccount.description = data.description;
    userBankAccount.active = true;

    const createdAccount = await this.userBankAccountModel.create(
      userBankAccount,
    );

    return createdAccount;
  }
}
