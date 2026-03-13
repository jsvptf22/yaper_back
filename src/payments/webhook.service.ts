import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { lastValueFrom, map } from 'rxjs';
import { CoinTransactionService } from 'src/transactions/coin-transaction.service';
import { UsersService } from 'src/users/users.service';
import { Payment, PaymentState } from './payment.model';
import { PaymentsService } from './payments.service';

@Injectable()
export class WebhookService {
  constructor(
    private httpService: HttpService,
    @InjectModel(Payment.name)
    private paymentModel: Model<Payment>,
    private paymentService: PaymentsService,
    private coinTransactionService: CoinTransactionService,
  ) {}

  async validatePayment(paymentData) {
    // test mp webhook
    if (paymentData.action === 'test.created') {
      return true;
    }

    if (!paymentData.data?.id) {
      throw new Error('invalid webhook payload: missing data.id');
    }

    const mpPayment = await this.getPayment(paymentData);
    const mpOrder = await this.getOrder(mpPayment);
    const payment = await this.getPaymentByOrder(mpOrder);

    // el mismo webhook puede llegar más de una vez
    if (payment.state !== PaymentState.APPROVED) {
      const incomingState = Object.values(PaymentState).includes(
        mpPayment.status,
      )
        ? (mpPayment.status as PaymentState)
        : null;

      if (!incomingState) {
        throw new Error(`unexpected payment status from MP: ${mpPayment.status}`);
      }

      payment.mp_order = JSON.stringify(mpOrder);
      payment.mp_payment = JSON.stringify(mpPayment);
      payment.state = incomingState;
      await this.paymentModel.updateOne({ _id: payment._id }, { ...payment });

      if (payment.state === PaymentState.APPROVED) {
        await this.updateUser(payment);
      }
    }
  }

  async updateUser(payment: Payment) {
    const user = await this.paymentService.getUser(payment);
    const paymentPackage = await this.paymentService.getPaymentPackage(payment);
    await this.coinTransactionService.transfer(
      UsersService.HOME_USER_ID,
      user._id,
      paymentPackage.coins,
      payment,
    );
  }

  async getPaymentByOrder(mpOrder): Promise<Payment> {
    const payment = await this.paymentModel.findOne({
      mp_preference_id: mpOrder.preference_id,
    });

    if (!payment) {
      throw new Error('preference dont exists');
    }

    return payment;
  }

  private async getOrder(mpPaymentData: any) {
    const orderUrl = `https://api.mercadolibre.com/merchant_orders/${mpPaymentData.order.id}`;
    const mpOrderData = await lastValueFrom(
      this.httpService
        .get(orderUrl, {
          headers: {
            Authorization: 'Bearer ' + process.env.MP_PRIVATE_KEY,
          },
        })
        .pipe(map((response) => response.data)),
    );
    return mpOrderData;
  }

  private async getPayment(paymentData: any) {
    const paymentUrl = `https://api.mercadopago.com/v1/payments/${paymentData.data.id}`;
    const mpPaymentData = await lastValueFrom(
      this.httpService
        .get(paymentUrl, {
          headers: {
            Authorization: 'Bearer ' + process.env.MP_PRIVATE_KEY,
          },
        })
        .pipe(map((response) => response.data)),
    );
    return mpPaymentData;
  }
}
