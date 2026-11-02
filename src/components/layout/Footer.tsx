import { usePublicCopy } from '@/hooks/usePublicCopy';

import { Link } from "react-router-dom";
import { Mail, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

const Footer = () => {
  const copy = usePublicCopy();
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-background border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="typography-h3 text-gradient-orange mb-4">ALMONA Co.</h3>
            <p className="text-muted-foreground mb-4">{copy("Authorized dealer of YILMAZ machines in Egypt. Company established 1991. Delivering quality products and services to the equipments and machinery industry.")}</p>
            <div className="flex gap-3">
              <Button asChild size="icon" variant="outline" className="rounded-full border-almona-orange">
                <a dir="ltr" href="tel:+201003097177" aria-label={copy("Call ALMONA")}><Phone className="h-5 w-5" /></a>
              </Button>
              <Button asChild size="icon" variant="outline" className="rounded-full border-almona-orange">
                <a dir="ltr" href="mailto:info@almona02.com" aria-label={copy("Email ALMONA")}><Mail className="h-5 w-5" /></a>
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="typography-h3 text-lg text-foreground mb-4">{copy("Quick Links")}</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/products/machines" className="text-muted-foreground hover:text-almona-orange transition-colors">{copy("YILMAZ Machines")}</Link>
              </li>
              <li>
                <Link to="/services" className="text-muted-foreground hover:text-almona-orange transition-colors">{copy("Our Services")}</Link>
              </li>
              <li>
                <a href="/dealer-verification-en" className="text-muted-foreground hover:text-almona-orange transition-colors">{copy("Official YILMAZ dealer certificate")}</a>
              </li>
              <li>
                <Link to="/shop" className="text-muted-foreground hover:text-almona-orange transition-colors">{copy("Shop Online")}</Link>
              </li>
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-almona-orange transition-colors">{copy("Contact Us")}</Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="typography-h3 text-lg text-foreground mb-4">{copy("Our Services")}</h3>
            <ul className="space-y-2">
              <li className="text-muted-foreground hover:text-almona-orange transition-colors">
                <Link to="/shop">{copy("Machine Sales")}</Link>
              </li>
              <li className="text-muted-foreground hover:text-almona-orange transition-colors">
                <Link to="/services">{copy("Maintenance & Support")}</Link>
              </li>
              <li className="text-muted-foreground hover:text-almona-orange transition-colors">
                <Link to="/services/spare-parts">{copy("Spare Parts")}</Link>
              </li>
              <li className="text-muted-foreground hover:text-almona-orange transition-colors">
                <Link to="/services/training">{copy("Technical Training")}</Link>
              </li>
              <li className="text-muted-foreground hover:text-almona-orange transition-colors">
                <Link to="/services/consulting">{copy("Consulting")}</Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="typography-h3 text-lg text-foreground mb-4">{copy("Contact Us")}</h3>
            <ul className="space-y-4">
              <li className="flex items-start">
                <MapPin className="h-5 w-5 text-almona-orange me-2 mt-0.5" />
                <span className="text-muted-foreground">{copy("ALMONA Co. 13B/18 Tarik Ibn Ziad st. Taawen , Haram , Giza, Egypt")}</span>
              </li>
              <li className="flex items-center">
                <Phone className="h-5 w-5 text-almona-orange me-2" />
                <a className="text-muted-foreground hover:text-almona-orange" href="tel:+201003097177" dir="ltr">+20 100 309 7177</a>
              </li>
              <li className="flex items-center">
                <Mail className="h-5 w-5 text-almona-orange me-2" />
                <a className="text-muted-foreground hover:text-almona-orange" href="mailto:info@almona02.com" dir="ltr">info@almona02.com</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center">
          <p className="text-foreground text-sm mb-4 md:mb-0">
            <span dir="ltr">© {currentYear} ALMONA Co.</span> {copy('All rights reserved.')}
          </p>
          <div className="flex flex-wrap gap-4 text-sm text-foreground">
            <Link to="/terms" className="hover:text-almona-orange transition-colors">{copy("Terms & Conditions")}</Link>
            <Link to="/privacy" className="hover:text-almona-orange transition-colors">{copy("Privacy Policy")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
