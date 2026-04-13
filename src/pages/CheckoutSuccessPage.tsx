import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SiteLayout from "@/components/SiteLayout";
import { confirmOrderPayment } from "@/lib/api";
import { useCart } from "@/lib/cart";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const CheckoutSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id") ?? "";
  const { clearCart } = useCart();

  const { data: order, error, isLoading } = useQuery({
    queryKey: ["order-confirmation", sessionId],
    queryFn: () => confirmOrderPayment(sessionId),
    enabled: Boolean(sessionId),
    retry: false,
  });

  useEffect(() => {
    if (order?.payment_status === "paid") {
      clearCart();
    }
  }, [clearCart, order]);

  return (
    <SiteLayout mainClassName="pt-28">
      <section className="px-4 py-12">
        <div className="container mx-auto max-w-4xl">
          <Card className="border-border/60 bg-card/95">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 rounded-full bg-primary/10 p-4 text-primary">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <CardTitle className="text-3xl">Payment Confirmation</CardTitle>
            </CardHeader>
            <CardContent>
              {!sessionId ? (
                <div className="space-y-4 text-center">
                  <p className="text-muted-foreground">We could not find a Stripe checkout session in the URL.</p>
                  <Button asChild className="bg-primary hover:bg-primary/90">
                    <Link to="/cart">Return to Cart</Link>
                  </Button>
                </div>
              ) : isLoading ? (
                <p className="text-center text-muted-foreground">Confirming your Stripe payment and loading order details...</p>
              ) : error ? (
                <div className="space-y-4 text-center">
                  <p className="text-destructive">{error instanceof Error ? error.message : "Payment confirmation failed."}</p>
                  <Button asChild className="bg-primary hover:bg-primary/90">
                    <Link to="/checkout">Back to Checkout</Link>
                  </Button>
                </div>
              ) : order ? (
                <div className="space-y-8">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-foreground">
                      {order.payment_status === "paid" ? "Payment received successfully." : "Payment is not marked as paid yet."}
                    </p>
                    <p className="mt-2 text-muted-foreground">
                      Order <span className="font-medium text-foreground">{order.id}</span> has been stored in Neo4j with status <span className="font-medium text-foreground">{order.order_status}</span>.
                    </p>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <Card className="border-border/60">
                      <CardHeader>
                        <CardTitle className="text-xl">Customer</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">{order.customer.full_name}</p>
                        <p>{order.customer.email}</p>
                        <p>{order.customer.phone_number}</p>
                        <p>{order.customer.address}</p>
                        <p>
                          {order.customer.city}, {order.customer.state} {order.customer.postal_code}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-border/60">
                      <CardHeader>
                        <CardTitle className="text-xl">Payment</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <p>
                          Status: <span className="font-medium text-foreground">{order.payment_status}</span>
                        </p>
                        <p>
                          Provider: <span className="font-medium text-foreground">{order.payment_provider}</span>
                        </p>
                        <p>
                          Session: <span className="font-medium text-foreground">{order.stripe_checkout_session_id}</span>
                        </p>
                        <p>
                          Total: <span className="font-medium text-foreground">{currencyFormatter.format(order.total_amount_inr)}</span>
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="border-border/60">
                    <CardHeader>
                      <CardTitle className="text-xl">Items</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-4 rounded-xl border border-border/60 px-4 py-3">
                          <div>
                            <p className="font-medium text-foreground">{item.product_name}</p>
                            <p className="text-sm text-muted-foreground">
                              Qty {item.quantity} x {currencyFormatter.format(item.unit_price_inr)}
                            </p>
                          </div>
                          <p className="font-semibold text-foreground">{currencyFormatter.format(item.subtotal_inr)}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <div className="flex flex-wrap justify-center gap-3">
                    <Button asChild className="bg-primary hover:bg-primary/90">
                      <Link to="/#shop">Shop Again</Link>
                    </Button>
                    <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                      <Link to="/cart">View Cart</Link>
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>
    </SiteLayout>
  );
};

export default CheckoutSuccessPage;
