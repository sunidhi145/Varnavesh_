import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Hero from "@/components/Hero";
import Shop from "@/components/Shop";
import CustomizeStyle from "@/components/CustomizeStyle";
import StyleConsultation from "@/components/StyleConsultation";
import Contact from "@/components/Contact";
import SiteLayout from "@/components/SiteLayout";

const Index = () => {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const targetId = location.hash.replace("#", "");
    window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }, [location.hash]);

  return (
    <SiteLayout>
      <div id="hero">
        <Hero />
        <Shop />
        <CustomizeStyle />
        <StyleConsultation />
        <Contact />
      </div>
    </SiteLayout>
  );
};

export default Index;
