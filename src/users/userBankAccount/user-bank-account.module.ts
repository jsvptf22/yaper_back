import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserBankAccountController } from './user-bank-accont.controller';
import {
  UserBankAccount,
  UserBankAccountSchema,
} from './user-bank-account.model';
import { UserBankAccountService } from './user-bank-account.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserBankAccount.name, schema: UserBankAccountSchema },
    ]),
  ],
  controllers: [UserBankAccountController],
  providers: [UserBankAccountService],
  exports: [UserBankAccountService],
})
export class UserBankAccountModule {}
