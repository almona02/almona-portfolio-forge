import { Link } from "react-router-dom";
import { CompanyTimeline } from "@/components/about/CompanyTimeline";
import { TeamProfiles } from "@/components/about/TeamProfiles";
import { CompanyValues } from "@/components/about/CompanyValues";
import { CustomerTestimonials } from "@/components/about/CustomerTestimonials";
import { Button } from "@/shared/ui/ui/button";

const About = () => {
  return (
    <div className="container py-12">
      <h1 className="text-4xl font-bold mb-8">About Almona</h1>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Our Story</h2>
          <p className="text-lg mb-6">
            Founded in 1991, Almona has grown from a Equipments importer to a
            leading industrial equipment provider in Egypt , Africa and the
            Middle East.
          </p>
          <p className="text-lg mb-6">
            We specialize in high-quality machinery for metal fabrication,
            plastic processing, and aluminum profile production.
          </p>
          <Button asChild>
            <Link to="/contact" className="mt-4">
              Contact Us
            </Link>
          </Button>
        </div>

        <div>
          <CompanyTimeline />
        </div>
      </div>

      <div className="bg-secondary p-8 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
        <p className="text-lg">
          To provide Egyptian manufacturers with world-class equipment and
          support, helping them compete in global markets.
        </p>
      </div>

      <TeamProfiles />

      <CompanyValues />

      <CustomerTestimonials />
    </div>
  );
};

export default About;
