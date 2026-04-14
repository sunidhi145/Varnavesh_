import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SiteLayout from "@/components/SiteLayout";
import { fetchProducts, getProductFallbackImage } from "@/lib/api";
import { useCart } from "@/lib/cart";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const CartPage = () => {
  const { items, removeItem, updateQuantity } = useCart();
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });

  const detailedItems = items
    .map((item) => {
      const product = products.find((candidate) => candidate.id === item.productId);
      return product ? { product, quantity: item.quantity, subtotal: product.price_inr * item.quantity } : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const totalAmount = detailedItems.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <SiteLayout mainClassName="pt-28">
      <section className="px-4 py-12">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-sm uppercase tracking-[0.4em] text-primary">Bag Summary</p>
              <h1 className="text-4xl font-bold text-foreground md:text-5xl">Your Cart</h1>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                Review your selected VARNAVESH pieces, adjust quantities, and move into secure Stripe test checkout.
              </p>
            </div>
            <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
              <Link to="/#shop">Continue Shopping</Link>
            </Button>
          </div>

          {isLoading ? (
            <Card className="border-border/60">
              <CardContent className="py-12 text-center text-muted-foreground">Loading your cart items...</CardContent>
            </Card>
          ) : detailedItems.length === 0 ? (
            <Card className="border-border/60 bg-card/90">
              <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
                <div className="rounded-full bg-primary/10 p-4 text-primary">
                  <ShoppingBag className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">Your cart is empty</h2>
                  <p className="mt-2 max-w-md text-muted-foreground">
                    Add outfits or accessories from the collection to begin a real checkout flow.
                  </p>
                </div>
                <Button asChild className="bg-primary hover:bg-primary/90">
                  <Link to="/#shop">Browse Collection</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[1.7fr_0.9fr]">
              <div className="space-y-4">
                {detailedItems.map(({ product, quantity, subtotal }) => (
                  <Card key={product.id} className="overflow-hidden border-border/60 bg-card/95">
                    <CardContent className="grid gap-4 p-5 sm:grid-cols-[140px_1fr]">
                      <div className="overflow-hidden rounded-xl bg-muted" style={{ aspectRatio: "3/4" }}>
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-full w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.src = getProductFallbackImage(product.slug);
                          }}
                        />
                      </div>
                      <div className="flex flex-col justify-between gap-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-sm uppercase tracking-[0.3em] text-primary/80">{product.category}</p>
                            <h2 className="mt-1 text-2xl font-semibold text-foreground">{product.name}</h2>
                            <p className="mt-2 text-sm text-muted-foreground">{currencyFormatter.format(product.price_inr)} each</p>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => removeItem(product.id)} aria-label={`Remove ${product.name}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="flex items-center rounded-full border border-border bg-background/80">
                            <button
                              type="button"
                              className="px-4 py-2 text-foreground transition-colors hover:text-primary"
                              onClick={() => updateQuantity(product.id, quantity - 1)}
                              aria-label={`Decrease quantity for ${product.name}`}
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="min-w-12 text-center text-sm font-semibold text-foreground">{quantity}</span>
                            <button
                              type="button"
                              className="px-4 py-2 text-foreground transition-colors hover:text-primary"
                              onClick={() => updateQuantity(product.id, quantity + 1)}
                              aria-label={`Increase quantity for ${product.name}`}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Subtotal</p>
                            <p className="text-xl font-semibold text-foreground">{currencyFormatter.format(subtotal)}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="h-fit border-border/60 bg-card/95">
                <CardHeader>
                  <CardTitle className="text-2xl">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 text-sm text-muted-foreground">
                    {detailedItems.map(({ product, quantity, subtotal }) => (
                      <div key={product.id} className="flex items-center justify-between gap-4">
                        <span>
                          {product.name} x {quantity}
                        </span>
                        <span className="font-medium text-foreground">{currencyFormatter.format(subtotal)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-border pt-4">
                    <div className="flex items-center justify-between text-lg font-semibold text-foreground">
                      <span>Total</span>
                      <span>{currencyFormatter.format(totalAmount)}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Final card entry happens on secure Stripe Checkout in test mode.
                    </p>
                  </div>
                  <Button asChild className="w-full bg-primary hover:bg-primary/90">
                    <Link to="/checkout">Proceed to Checkout</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
};
export default CartPage;
