const stripe = require('stripe');

class StripeService {
  constructor() {
    this.client = stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
  }

  async createCheckoutSession(items, successUrl, cancelUrl) {
    try {
      const session = await this.client.checkout.sessions.create({
        line_items: items,
        payment_method_types: ['card'],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
      return session;
    } catch (error) {
      console.error('Stripe createCheckoutSession error:', error);
      throw new Error('Failed to create Stripe checkout session');
    }
  }

  async createCustomer(email, name) {
    try {
      const customer = await this.client.customers.create({
        email,
        name,
      });
      return customer;
    } catch (error) {
      console.error('Stripe createCustomer error:', error);
      throw new Error('Failed to create Stripe customer');
    }
  }

  async createSubscription(customerId, planId) {
    try {
      const subscription = await this.client.subscriptions.create({
        customer: customerId,
        items: [{ plan: planId }],
      });
      return subscription;
    } catch (error) {
      console.error('Stripe createSubscription error:', error);
      throw new Error('Failed to create Stripe subscription');
    }
  }

  async getSubscription(subscriptionId) {
    try {
      const subscription = await this.client.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error) {
      console.error('Stripe getSubscription error:', error);
      throw new Error('Failed to retrieve Stripe subscription');
    }
  }

  async cancelSubscription(subscriptionId) {
    try {
      const subscription = await this.client.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
      return subscription;
    } catch (error) {
      console.error('Stripe cancelSubscription error:', error);
      throw new Error('Failed to cancel Stripe subscription');
    }
  }

  async createWebhookHandler() {
    return (req, res) => {
      const sig = req.headers['stripe-signature'];
      let event;

      try {
        event = this.client.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
      } catch (err) {
        console.log('⚠️  Webhook signature verification failed.', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object;
          console.log('💰 PaymentIntent was successful!', paymentIntent);
          break;
        case 'payment_intent.payment_failed':
          console.log('❌ Payment failed:', event.data.object);
          break;
        case 'invoice.payment_succeeded':
          console.log('✅ Invoice paid:', event.data.object);
          break;
        case 'customer.subscription.deleted':
          console.log('🗑️  Subscription deleted:', event.data.object);
          break;
        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.json({ received: true });
    };
  }
}

module.exports = StripeService;