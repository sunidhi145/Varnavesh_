import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import logo from "@/assets/logo.png";

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { itemCount } = useCart();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navigateToSection = (id: string) => {
    setIsMobileMenuOpen(false);

    if (location.pathname === "/") {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    navigate(`/#${id}`);
  };

  const navLinks = [
    { label: "Home", id: "hero" },
    { label: "Shop", id: "shop" },
    { label: "Contact", id: "contact" },
  ];

  const textClassName = isScrolled || location.pathname !== "/" ? "text-foreground" : "text-white";

  return (
    <nav
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        isScrolled || location.pathname !== "/" ? "bg-background/95 shadow-md backdrop-blur-md" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <button onClick={() => navigateToSection("hero")} className="flex items-center gap-3">
          <img src={logo} alt="Varnavesh Logo" className="h-16 w-auto drop-shadow-md md:h-20" />
          <span className={`hidden text-lg font-semibold tracking-[0.3em] md:block ${textClassName}`}>VARNAVESH</span>
        </button>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => navigateToSection(link.id)}
              className={`text-sm font-medium transition-colors hover:text-primary ${textClassName}`}
            >
              {link.label}
            </button>
          ))}
          <Link
            to="/cart"
            className={`relative flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${textClassName}`}
          >
            <ShoppingBag className="h-4 w-4" />
            Cart
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{itemCount}</span>
          </Link>
        </div>

        <div className="flex items-center gap-3 md:hidden">
          <Link to="/cart" className={`relative ${textClassName}`} aria-label="Open cart">
            <ShoppingBag className="h-5 w-5" />
            <span className="absolute -right-2 -top-2 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
              {itemCount}
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className={textClassName}
            onClick={() => setIsMobileMenuOpen((current) => !current)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="border-t border-border bg-background/95 backdrop-blur-md md:hidden">
          <div className="container mx-auto flex flex-col gap-4 px-4 py-4">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => navigateToSection(link.id)}
                className="text-left text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
              >
                {link.label}
              </button>
            ))}
            <Link
              to="/cart"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-left text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
            >
              Cart ({itemCount})
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
