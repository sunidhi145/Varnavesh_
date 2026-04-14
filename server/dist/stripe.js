import Stripe from "stripe";
import { serverConfig } from "./config.js";
let stripeClient = null;
export function getStripeClient() {
    if (!stripeClient) {
        stripeClient = new Stripe(serverConfig.stripe.secretKey);
    }
    return stripeClient;
}
