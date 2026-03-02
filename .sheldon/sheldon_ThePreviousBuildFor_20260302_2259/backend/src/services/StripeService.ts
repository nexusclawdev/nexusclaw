const stripe = require('stripe');

class StripeService {
  constructor() {
    this.stripe = stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
  }

  async createCustomer(email, name) {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: { source: 'ai-research-platform' }
      });
      return customer;
    } catch (error) {
      throw new Error(`Stripe customer creation failed: ${error.message}`);
    }
  }

  async createSubscription(customerId, planId) {
    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ plan: planId }],
        expand: ['latest_invoice.payment_intent']
      });
      return subscription;
    } catch (error) {
      throw new Error(`Stripe subscription creation failed: ${error.message}`);
    }
  }

  async getSubscription(subscriptionId) {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error) {
      throw new Error(`Stripe subscription retrieval failed: ${error.message}`);
    }
  }

  async cancelSubscription(subscriptionId) {
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
        cancellation_reason: 'requested_by_customer'
      });
      return subscription;
    } catch (error) {
      throw new Error(`Stripe cancellation failed: ${error.message}`);
    }
  }

  async createInvoice(customerId, items) {
    try {
      const invoice = await this.stripe.invoices.create({
        customer: customerId,
        lines: {
          data: items.map(item => ({
            price_data: {
              currency: 'usd',
              product_data: {
                name: item.name,
                description: item.description,
              },
              unit_amount: item.amount,
            },
            quantity: item.quantity || 1,
          }))
        }
      });
      return invoice;
    } catch (error) {
      throw new Error(`Stripe invoice creation failed: ${error.message}`);
    }
  }

  async payInvoice(invoiceId) {
    try {
      const invoice = await this.stripe.invoices.pay(invoiceId);
      return invoice;
    } catch (error) {
      throw new Error(`Stripe invoice payment failed: ${error.message}`);
    }
  }

  async createWebhookHandler() {
    return async (req, res) => {
      const sig = req.headers['stripe-signature'];
      let event;
      
      try {
        event = this.stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
      } catch (err) {
        console.log(`Webhook signature verification failed.`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      switch (event.type) {
        case 'invoice.payment_succeeded':
          console.log('Payment succeeded:', event.data.object);
          break;
        case 'invoice.payment_failed':
          console.log('Payment failed:', event.data.object);
          break;
        case 'customer.subscription.deleted':
          console.log('Subscription cancelled:', event.data.object);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    };
  }
}

module.exports = StripeService;