import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Eye, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { useCart } from "@/lib/cart";
import { fetchProducts, getProductFallbackImage, type ProductRecord } from "@/lib/api";
import shopBg from "@/assets/shop-bg.jpg";
import shopOverlay from "@/assets/shop-overlay.png";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const formatPrice = (price: number) => currencyFormatter.format(price);

const renderProductFallback = (title: string, message: string) => (
  <Card className="border-border/50 bg-background/80">
    <CardContent className="py-10 text-center">
      <h4 className="mb-2 text-xl font-semibold text-foreground">{title}</h4>
      <p className="text-muted-foreground">{message}</p>
    </CardContent>
  </Card>
);

const Shop = () => {
  const { data: products = [], error, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });
  const { addItem, itemCount } = useCart();

  const handleAddToCart = (product: ProductRecord) => {
    addItem(product.id);
    toast.success(`${product.name} added to cart.`);
  };

  const handleViewDetails = (productName: string) => {
    toast.info(`Product spotlight: ${productName}`);
  };

  const renderProductGrid = (items: ProductRecord[]) => (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {items.map((product, index) => (
        <Card
          key={product.id}
          className="group animate-slide-up overflow-hidden border-border/50 bg-card/90 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <CardHeader className="p-0">
            <div className="relative overflow-hidden" style={{ aspectRatio: "9/16" }}>
              <img
                src={product.image_url}
                alt={product.name}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                onError={(event) => {
                  const fallbackImage = getProductFallbackImage(product.slug);

                  if (event.currentTarget.src === fallbackImage) {
                    return;
                  }

                  event.currentTarget.src = fallbackImage;
                }}
              />
              <div className="absolute left-4 top-4 flex gap-2">
                <span className="rounded-full bg-background/85 px-3 py-1 text-xs font-semibold text-foreground">
                  {product.category}
                </span>
                <span className="rounded-full bg-secondary/90 px-3 py-1 text-xs font-semibold text-secondary-foreground">
                  {product.product_type === "outfit" ? "Outfit" : "Accessory"}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <h3 className="mb-2 text-xl font-semibold text-foreground">{product.name}</h3>
            {product.description ? (
              <p className="mb-3 text-sm leading-6 text-muted-foreground">{product.description}</p>
            ) : null}
            <p className="text-2xl font-bold text-primary">{formatPrice(product.price_inr)}</p>
          </CardContent>
          <CardFooter className="flex gap-3 p-6 pt-0">
            <Button
              variant="outline"
              className="flex-1 border-primary text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              onClick={() => handleViewDetails(product.name)}
            >
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </Button>
            <Button
              className="flex-1 bg-primary transition-all hover:scale-105 hover:bg-primary/90"
              onClick={() => handleAddToCart(product)}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Add to Cart
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );

  const outfits = products.filter((product) => product.product_type === "outfit");
  const accessories = products.filter((product) => product.product_type === "accessory");

  const renderCollectionSection = (
    title: string,
    items: ProductRecord[],
    loadingMessage: string,
    errorMessage: string,
    emptyMessage: string,
  ) => (
    <div className="mb-20 last:mb-0">
      <h3 className="mb-8 text-center text-3xl font-bold text-foreground md:text-4xl">{title}</h3>
      {isLoading
        ? renderProductFallback(`Loading ${title}`, loadingMessage)
        : error
          ? renderProductFallback(`${title} Unavailable`, errorMessage)
          : items.length === 0
            ? renderProductFallback(`${title} Coming Soon`, emptyMessage)
            : renderProductGrid(items)}
    </div>
  );

  return (
    <section
      id="shop"
      className="relative overflow-hidden px-4 py-20"
      style={{
        backgroundImage: `url(${shopBg})`,
        backgroundAttachment: "fixed",
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      <div className="absolute inset-0 bg-background/75 backdrop-blur-sm" />

      <div
        className="pointer-events-none absolute left-0 top-1/4 hidden h-96 w-80 opacity-15 lg:block"
        style={{
          backgroundImage: `url(${shopOverlay})`,
          backgroundPosition: "left center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "contain",
          transform: "translateX(-25%)",
        }}
      />

      <div
        className="pointer-events-none absolute bottom-1/4 right-0 hidden h-96 w-80 opacity-15 lg:block"
        style={{
          backgroundImage: `url(${shopOverlay})`,
          backgroundPosition: "right center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "contain",
          transform: "translateX(25%) scaleX(-1)",
        }}
      />

      <div className="container relative z-10 mx-auto">
        <div className="mb-12 animate-fade-in text-center">
          <h2 className="mb-4 text-4xl font-bold text-foreground md:text-5xl">Our Collection</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Discover our curated selection of Indo-Western luxury pieces, where tradition meets contemporary elegance.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <div className="rounded-full border border-border/70 bg-card/80 px-4 py-2 text-sm text-muted-foreground">
              {itemCount} item{itemCount === 1 ? "" : "s"} in your cart
            </div>
            <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
              <Link to="/cart">View Cart</Link>
            </Button>
          </div>
        </div>

        {renderCollectionSection(
          "Outfits",
          outfits,
          "Fetching the latest VARNAVESH pieces...",
          "We couldn't load the collection right now. Please try again in a moment.",
          "Our outfit lineup is being refreshed. Please check back shortly.",
        )}

        {renderCollectionSection(
          "Accessories",
          accessories,
          "Fetching handcrafted accessories...",
          "We couldn't load the accessories right now. Please try again in a moment.",
          "Our accessory lineup is being refreshed. Please check back shortly.",
        )}
      </div>
    </section>
  );
};
export default Shop;
