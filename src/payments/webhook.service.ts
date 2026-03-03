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
    console.log('webhook data', paymentData);

    //test mp webhook
    if (paymentData.action === 'test.created') {
      return true;
    }

    const mpPayment = await this.getPayment(paymentData);
    console.log('mp payments', mpPayment);

    const mpOrder = await this.getOrder(mpPayment);
    const payment = await this.getPaymentByOrder(mpOrder);

    //llega 2 veces el mismo webhook
    if (payment.state !== PaymentState.APPROVED) {
      payment.mp_order = JSON.stringify(mpOrder);
      payment.mp_payment = JSON.stringify(mpPayment);
      payment.state = mpPayment.status;
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
    /*
    curl -X GET \      
    'https://api.mercadolibre.com/merchant_orders/d9348590dc72' \
    -H 'Authorization: Bearer TEST-5785841434120529-112219-15c28d6765dc01fc4cdafae93d99151e-1001501215' > log.txt
    */
    const orderUrl = `https://api.mercadolibre.com/merchant_orders/${mpPaymentData.order.id}`;
    console.log(orderUrl);
    const mpOrderData = await lastValueFrom(
      this.httpService
        .get(orderUrl, {
          headers: {
            Authorization: 'Bearer ' + process.env.MP_PRIVATE_KEY,
          },
        })
        .pipe(map((response) => response.data)),
    );
    console.log('mp order', mpOrderData);
    return mpOrderData;
  }

  private async getPayment(paymentData: any) {
    //consulto el pago con data.id
    /*
    curl -X GET \      
    'https://api.mercadopago.com/v1/payments/1311093876' \
    -H 'Authorization: Bearer TEST-5785841434120529-112219-15c28d6765dc01fc4cdafae93d99151e-1001501215' > logpayment.txt
    */
    const paymentUrl = `https://api.mercadopago.com/v1/payments/${paymentData.data.id}`;
    console.log(paymentUrl);
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
