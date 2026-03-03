import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CoinTransactionModule } from 'src/transactions/coin-transaction.module';
import { UserBankAccountModule } from 'src/users/userBankAccount/user-bank-account.module';
import { UsersModule } from 'src/users/users.module';
import { PubsubModule } from '../pubsub/pubsub.module';
import { OfferController } from './offer.controller';
import { Offer, OfferSchema } from './offer.model';
import { OfferService } from './offer.service';

@Module({
  imports: [
    PubsubModule,
    MongooseModule.forFeature([{ name: Offer.name, schema: OfferSchema }]),
    CoinTransactionModule,
    UsersModule,
    UserBankAccountModule,
  ],
  providers: [OfferService],
  exports: [OfferService],
  controllers: [OfferController],
})
export class OfferModule {}
