import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CoinTransactionModule } from 'src/transactions/coin-transaction.module';
import { User, UserSchema } from 'src/users/user.model';
import { UsersModule } from 'src/users/users.module';
import { PaymentPackage, PaymentPackageSchema } from './payment-package.model';
import { Payment, PaymentSchema } from './payment.model';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { WebhookService } from './webhook.service';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: PaymentPackage.name, schema: PaymentPackageSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: User.name, schema: UserSchema },
    ]),
    UsersModule,
    CoinTransactionModule,
  ],
  providers: [PaymentsService, WebhookService],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
