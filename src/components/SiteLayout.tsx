import type { ReactNode } from "react";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";

type SiteLayoutProps = {
  children: ReactNode;
  mainClassName?: string;
};

const SiteLayout = ({ children, mainClassName = "" }: SiteLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className={mainClassName}>{children}</main>
      <Footer />
    </div>
  );
};

export default SiteLayout;
