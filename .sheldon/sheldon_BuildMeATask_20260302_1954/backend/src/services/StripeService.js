const Stripe = require('stripe');

class StripeService {
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
      apiVersion: '2024-08-15',
      typescript: true,
    });
  }

  async createCustomer(email, name) {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: { source: 'task-manager-app' },
      });
      return customer;
    } catch (error) {
      throw new Error(`Stripe createCustomer failed: ${error.message}`);
    }
  }

  async createSetupIntent(customerId) {
    try {
      const setupIntent = await this.stripe.setupIntents.create({
        customer: customerId,
        usage: 'off_session',
        payment_method_types: ['card'],
      });
      return setupIntent;
    } catch (error) {
      throw new Error(`Stripe createSetupIntent failed: ${error.message}`);
    }
  }

  async createSubscription(customerId, paymentMethodId, planId) {
    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ plan: planId }],
        default_payment_method: paymentMethodId,
        expand: ['latest_invoice.payment_intent'],
      });
      return subscription;
    } catch (error) {
      throw new Error(`Stripe createSubscription failed: ${error.message}`);
    }
  }

  async cancelSubscription(subscriptionId) {
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
        cancellation_reason: 'requested_by_customer',
      });
      return subscription;
    } catch (error) {
      throw new Error(`Stripe cancelSubscription failed: ${error.message}`);
    }
  }

  async getSubscription(subscriptionId) {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['latest_invoice.payment_intent'],
      });
      return subscription;
    } catch (error) {
      throw new Error(`Stripe getSubscription failed: ${error.message}`);
    }
  }

  async createInvoice(subscriptionId, items) {
    try {
      const invoice = await this.stripe.invoices.create({
        subscription: subscriptionId,
        collection_method: 'send_invoice',
        days_until_due: 30,
        line_items: items,
      });
      return invoice;
    } catch (error) {
      throw new Error(`Stripe createInvoice failed: ${error.message}`);
    }
  }

  async createPaymentIntent(amount, currency, paymentMethodId, customerId) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount,
        currency,
        payment_method: paymentMethodId,
        customer: customerId,
        confirm: true,
        off_session: true,
        confirmation_method: 'automatic',
      });
      return paymentIntent;
    } catch (error) {
      throw new Error(`Stripe createPaymentIntent failed: ${error.message}`);
    }
  }

  async refundPayment(paymentIntentId, amount) {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount,
      });
      return refund;
    } catch (error) {
      throw new Error(`Stripe refundPayment failed: ${error.message}`);
    }
  }

  async getBalance() {
    try {
      const balance = await this.stripe.balance.retrieve();
      return balance;
    } catch (error) {
      throw new Error(`Stripe getBalance failed: ${error.message}`);
    }
  }
}

module.exports = StripeService;