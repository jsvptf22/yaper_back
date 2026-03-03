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
  ) {}

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

    // Agrega credenciales
    mercadopago.configure({
      access_token: process.env.MP_PRIVATE_KEY,
    });

    // Crea un objeto de preferencia
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

    const payment = new Payment();
    payment._id = new Types.ObjectId();
    payment.payment_package_id = packageId;
    payment.mp_preference = JSON.stringify(createdPreference);
    payment.mp_preference_id = preferenceId;
    payment.state = PaymentState.CREATED;
    payment.user_id = user._id;
    await this.paymentModel.create(payment);

    return preferenceId;
  }
}
