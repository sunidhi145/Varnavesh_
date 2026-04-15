import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SiteLayout from "@/components/SiteLayout";
import { backendRequiredMessage, createCheckoutSession, fetchProducts, isBackendConfigured } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { checkoutFormSchema, getFieldErrors, type CheckoutFormValues } from "@/lib/validators";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const initialFormState: CheckoutFormValues = {
  fullName: "",
  email: "",
  phoneNumber: "",
  address: "",
  city: "",
  state: "",
  postalCode: "",
  notes: "",
};

const CheckoutPage = () => {
  const [formData, setFormData] = useState<CheckoutFormValues>(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CheckoutFormValues, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { items } = useCart();
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });

  const detailedItems = useMemo(
    () =>
      items
        .map((item) => {
          const product = products.find((candidate) => candidate.id === item.productId);
          return product ? { product, quantity: item.quantity, subtotal: product.price_inr * item.quantity } : null;
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    [items, products],
  );

  const totalAmount = detailedItems.reduce((sum, item) => sum + item.subtotal, 0);

  useEffect(() => {
    if (searchParams.get("cancelled") !== "1") {
      return;
    }

    toast.info("Stripe checkout was cancelled. Your cart is still saved.");
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("cancelled");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleInputChange = (field: keyof CheckoutFormValues, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!detailedItems.length) {
      toast.error("Add items to your cart before checking out.");
      return;
    }

    const parsed = checkoutFormSchema.safeParse(formData);
    if (!parsed.success) {
      setFieldErrors(getFieldErrors<keyof CheckoutFormValues>(parsed.error));
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const session = await createCheckoutSession(
        {
          fullName: parsed.data.fullName,
          email: parsed.data.email,
          phoneNumber: parsed.data.phoneNumber,
          address: parsed.data.address,
          city: parsed.data.city,
          state: parsed.data.state,
          postalCode: parsed.data.postalCode,
          notes: parsed.data.notes,
        },
        detailedItems.map(({ product, quantity }) => ({
          productId: product.id,
          quantity,
        })),
      );

      window.location.href = session.checkoutUrl;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We couldn't start checkout right now.");
      setIsSubmitting(false);
    }
  };

  return (
    <SiteLayout mainClassName="pt-28">
      <section className="px-4 py-12">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-sm uppercase tracking-[0.4em] text-primary">Secure Checkout</p>
              <h1 className="text-4xl font-bold text-foreground md:text-5xl">Checkout</h1>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                We collect delivery details here, then hand off card entry to Stripe Checkout test mode so your demo stays realistic and safe.
              </p>
            </div>
            <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
              <Link to="/cart">Back to Cart</Link>
            </Button>
          </div>

          {!isLoading && detailedItems.length === 0 ? (
            <Card className="border-border/60">
              <CardContent className="py-16 text-center">
                <h2 className="text-2xl font-semibold text-foreground">Your cart is empty</h2>
                <p className="mt-2 text-muted-foreground">Choose products first, then return here for checkout.</p>
                <Button asChild className="mt-6 bg-primary hover:bg-primary/90">
                  <Link to="/#shop">Browse Collection</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
              <Card className="border-border/60 bg-card/95">
                <CardHeader>
                  <CardTitle className="text-2xl">Customer Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <Label htmlFor="checkout-fullName">Full Name</Label>
                        <Input id="checkout-fullName" value={formData.fullName} onChange={(event) => handleInputChange("fullName", event.target.value)} />
                        {fieldErrors.fullName ? <p className="mt-1 text-sm text-destructive">{fieldErrors.fullName}</p> : null}
                      </div>
                      <div>
                        <Label htmlFor="checkout-email">Email</Label>
                        <Input id="checkout-email" type="email" value={formData.email} onChange={(event) => handleInputChange("email", event.target.value)} />
                        {fieldErrors.email ? <p className="mt-1 text-sm text-destructive">{fieldErrors.email}</p> : null}
                      </div>
                      <div>
                        <Label htmlFor="checkout-phone">Phone Number</Label>
                        <Input id="checkout-phone" type="tel" value={formData.phoneNumber} onChange={(event) => handleInputChange("phoneNumber", event.target.value)} />
                        {fieldErrors.phoneNumber ? <p className="mt-1 text-sm text-destructive">{fieldErrors.phoneNumber}</p> : null}
                      </div>
                      <div>
                        <Label htmlFor="checkout-postal">Postal Code</Label>
                        <Input id="checkout-postal" value={formData.postalCode} onChange={(event) => handleInputChange("postalCode", event.target.value)} />
                        {fieldErrors.postalCode ? <p className="mt-1 text-sm text-destructive">{fieldErrors.postalCode}</p> : null}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="checkout-address">Address</Label>
                      <Textarea id="checkout-address" rows={3} value={formData.address} onChange={(event) => handleInputChange("address", event.target.value)} />
                      {fieldErrors.address ? <p className="mt-1 text-sm text-destructive">{fieldErrors.address}</p> : null}
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <Label htmlFor="checkout-city">City</Label>
                        <Input id="checkout-city" value={formData.city} onChange={(event) => handleInputChange("city", event.target.value)} />
                        {fieldErrors.city ? <p className="mt-1 text-sm text-destructive">{fieldErrors.city}</p> : null}
                      </div>
                      <div>
                        <Label htmlFor="checkout-state">State</Label>
                        <Input id="checkout-state" value={formData.state} onChange={(event) => handleInputChange("state", event.target.value)} />
                        {fieldErrors.state ? <p className="mt-1 text-sm text-destructive">{fieldErrors.state}</p> : null}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="checkout-notes">Notes (Optional)</Label>
                      <Textarea id="checkout-notes" rows={4} value={formData.notes} onChange={(event) => handleInputChange("notes", event.target.value)} />
                      {fieldErrors.notes ? <p className="mt-1 text-sm text-destructive">{fieldErrors.notes}</p> : null}
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting || isLoading || !isBackendConfigured}
                      className="w-full bg-primary hover:bg-primary/90"
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      {!isBackendConfigured
                        ? "Backend Setup Required"
                        : isSubmitting
                          ? "Redirecting to Stripe..."
                          : "Pay with Stripe Test Checkout"}
                    </Button>
                    {!isBackendConfigured ? (
                      <p className="text-sm text-muted-foreground">{backendRequiredMessage}</p>
                    ) : null}
                  </form>
                </CardContent>
              </Card>

              <Card className="h-fit border-border/60 bg-card/95">
                <CardHeader>
                  <CardTitle className="text-2xl">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 text-sm text-muted-foreground">
                    {detailedItems.map(({ product, quantity, subtotal }) => (
                      <div key={product.id} className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-foreground">{product.name}</p>
                          <p>x {quantity}</p>
                        </div>
                        <span className="font-medium text-foreground">{currencyFormatter.format(subtotal)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-border pt-4">
                    <div className="flex items-center justify-between text-lg font-semibold text-foreground">
                      <span>Total</span>
                      <span>{currencyFormatter.format(totalAmount)}</span>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Use Stripe test card <span className="font-medium text-foreground">4242 4242 4242 4242</span> with any future expiry, any CVC, and any PIN/postal code during the demo.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
};
export default CheckoutPage;
