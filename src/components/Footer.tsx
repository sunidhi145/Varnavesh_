import { Instagram, Linkedin } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-luxury-black text-white py-12 px-4">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-2xl font-bold mb-4 text-gold">VARNAVESH</h3>
            <p className="text-white/80 text-sm">
              Born from tradition, tailored for the fearless.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li>
                <a href="#hero" className="hover:text-gold transition-colors">
                  Home
                </a>
              </li>
              <li>
                <a href="#shop" className="hover:text-gold transition-colors">
                  Shop
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-gold transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Follow Us</h4>
            <div className="flex gap-4">
              <a
                href="https://www.instagram.com/varnavesh.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-gold hover:text-luxury-black transition-all"
                aria-label="Instagram"
              >
                <Instagram size={20} />
              </a>
              <a
                href="https://www.linkedin.com/company/varnavesh/"
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-gold hover:text-luxury-black transition-all"
                aria-label="LinkedIn"
              >
                <Linkedin size={20} />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/20 pt-8 text-center text-sm text-white/60">
          <p>© {currentYear} VARNAVESH. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
