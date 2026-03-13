import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from 'src/users/user.model';
import { PaymentPackage } from './payment-package.model';
import { Payment, PaymentState } from './payment.model';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mercadopago = require('mercadopago');

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>,
    @InjectModel(Payment.name)
    private paymentModel: Model<Payment>,
    @InjectModel(PaymentPackage.name)
    private paymentPackageModel: Model<PaymentPackage>,
  ) {
    mercadopago.configure({
      access_token: process.env.MP_PRIVATE_KEY,
    });
  }

  async getUser(payment: Payment): Promise<User> {
    return this.userModel.findOne({
      _id: payment.user_id,
    });
  }

  async getPaymentPackage(payment: Payment): Promise<PaymentPackage> {
    return this.paymentPackageModel.findOne({
      _id: payment.payment_package_id,
    });
  }

  async getPaymentPackages(): Promise<PaymentPackage[]> {
    return this.paymentPackageModel.find({
      active: 1,
    });
  }

  async generatePreference(user: User, packageId: Types.ObjectId) {
    const paymentPackage = await this.paymentPackageModel.findOne({
      _id: packageId,
      active: 1,
    });

    if (!paymentPackage) {
      throw new Error('invalid package');
    }

    const preference = {
      items: [
        {
          title: `lucky paquete ${paymentPackage.title}`,
          unit_price: +paymentPackage.unit_price,
          quantity: 1,
        },
      ],
    };

    const createdPreference = await mercadopago.preferences.create(preference);
    const preferenceId = createdPreference.response.id;

    await this.paymentModel.create({
      _id: new Types.ObjectId(),
      user_id: user._id,
      payment_package_id: packageId,
      mp_preference: JSON.stringify(createdPreference),
      mp_preference_id: preferenceId,
      state: PaymentState.CREATED,
    });

    return preferenceId;
  }
}
