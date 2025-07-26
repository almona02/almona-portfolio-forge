
import { Link } from "react-router-dom";
import { Mail, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-almona-dark-lighter border-t border-gray-800">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-xl font-bold text-gradient-orange mb-4">ALMONA Co.</h3>
            <p className="text-gray-400 mb-4">
              Authorized dealer of YILMAZ machines and ALFAPEN profiles in Egypt since 1991.
              Delivering quality products and services to the aluminum and UPVC industry.
            </p>
            <div className="flex space-x-3">
              <Button size="icon" variant="outline" className="rounded-full border-almona-orange">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-almona-orange">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                </svg>
              </Button>
              <Button size="icon" variant="outline" className="rounded-full border-almona-orange">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-almona-orange">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </Button>
              <Button size="icon" variant="outline" className="rounded-full border-almona-orange">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-almona-orange">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path>
                  <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
                </svg>
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/products/machines" className="text-gray-400 hover:text-almona-orange transition-colors">
                  YILMAZ Machines
                </Link>
              </li>
              <li>
                <Link to="/products/profiles" className="text-gray-400 hover:text-almona-orange transition-colors">
                  ALFAPEN Profiles
                </Link>
              </li>
              <li>
                <Link to="/services" className="text-gray-400 hover:text-almona-orange transition-colors">
                  Our Services
                </Link>
              </li>
              <li>
                <Link to="/shop" className="text-gray-400 hover:text-almona-orange transition-colors">
                  Shop Online
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-400 hover:text-almona-orange transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Our Services</h3>
            <ul className="space-y-2">
              <li className="text-gray-400 hover:text-almona-orange transition-colors">
                <Link to="/services/sales">Machine Sales</Link>
              </li>
              <li className="text-gray-400 hover:text-almona-orange transition-colors">
                <Link to="/services/maintenance">Maintenance & Support</Link>
              </li>
              <li className="text-gray-400 hover:text-almona-orange transition-colors">
                <Link to="/services/spare-parts">Spare Parts</Link>
              </li>
              <li className="text-gray-400 hover:text-almona-orange transition-colors">
                <Link to="/services/training">Technical Training</Link>
              </li>
              <li className="text-gray-400 hover:text-almona-orange transition-colors">
                <Link to="/services/consulting">Consulting</Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Contact Us</h3>
            <ul className="space-y-4">
              <li className="flex items-start">
                <MapPin className="h-5 w-5 text-almona-orange mr-2 mt-0.5" />
                <span className="text-gray-400">
                  ALMONA Co. 13B/18 Tarik Ibn Ziad st. Taawen , Haram , Giza, Egypt
                </span>
              </li>
              <li className="flex items-center">
                <Phone className="h-5 w-5 text-almona-orange mr-2" />
                <span className="text-gray-400">+20 100 309 7177</span>
              </li>
              <li className="flex items-center">
                <Mail className="h-5 w-5 text-almona-orange mr-2" />
                <span className="text-gray-400">almona02@yahoo.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm mb-4 md:mb-0">
            © {currentYear} ALMONA Co. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            <Link to="/terms" className="hover:text-almona-orange transition-colors">
              Terms & Conditions
            </Link>
            <Link to="/privacy" className="hover:text-almona-orange transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
