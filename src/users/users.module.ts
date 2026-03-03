import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PubsubModule } from '../pubsub/pubsub.module';
import { UserController } from './user.controller';
import { User, UserSchema } from './user.model';
import { UserResolver } from './user.resolver';
import { UserBankAccountModule } from './userBankAccount/user-bank-account.module';
import { UsersService } from './users.service';

@Module({
  imports: [
    PubsubModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    UserBankAccountModule,
  ],
  providers: [UsersService, UserResolver],
  exports: [UsersService],
  controllers: [UserController],
})
export class UsersModule {}
