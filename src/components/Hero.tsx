import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-image.jpg";
import { ArrowDown } from "lucide-react";

const Hero = () => {
  const scrollToShop = () => {
    document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Hero Image with Overlay */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="VARNAVESH luxury Indo-Western fashion"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-luxury-black/60 via-luxury-black/40 to-luxury-black/70" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-4 animate-fade-in text-5xl font-bold tracking-wide text-white md:text-7xl lg:text-8xl">
          VARNAVESH
        </h1>
        <p className="mb-8 max-w-2xl animate-slide-up text-lg font-light text-white/90 md:text-xl lg:text-2xl">
          Born from tradition, tailored for the fearless.
        </p>
        <Button
          onClick={scrollToShop}
          size="lg"
          className="animate-slide-up bg-gold text-luxury-black hover:bg-gold/90 transition-all duration-300 hover:scale-105 font-semibold"
        >
          Explore Collection
        </Button>
        
        <button
          onClick={scrollToShop}
          className="absolute bottom-8 animate-bounce text-white/80 hover:text-white transition-colors"
          aria-label="Scroll to shop section"
        >
          <ArrowDown size={32} />
        </button>
      </div>
    </section>
  );
};

export default Hero;
