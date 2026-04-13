import Stripe from "stripe";
import { ApiError } from "./errors.js";
import { serverConfig } from "./config.js";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  if (!serverConfig.stripe.secretKey) {
    throw new ApiError("Checkout is not configured yet. Add STRIPE_SECRET_KEY to enable payments.", 503);
  }

  if (!stripeClient) {
    stripeClient = new Stripe(serverConfig.stripe.secretKey);
  }

  return stripeClient;
}
