import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { CoinTransactionService } from './coin-transaction.service';
import { Transaction, TransactionSchema } from './transaction.model';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
    ]),
  ],
  providers: [CoinTransactionService],
  exports: [CoinTransactionService],
})
export class CoinTransactionModule {}
