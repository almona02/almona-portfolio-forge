import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

const values = [
  {
    title: "Customer Centricity",
    description: "We are committed to providing our customers with the best possible experience. We listen to their needs and work tirelessly to meet their expectations.",
  },
  {
    title: "Innovation",
    description: "We are constantly looking for new and better ways to do things. We embrace change and are always pushing the boundaries of what's possible.",
  },
  {
    title: "Integrity",
    description: "We are honest and transparent in all our dealings. We are committed to doing the right thing, even when it's not the easy thing.",
  },
  {
    title: "Teamwork",
    description: "We believe that we are stronger together. We work collaboratively to achieve our common goals and support each other along the way.",
  },
];

export const CompanyValues = () => {
  return (
    <div className="py-6 sm:py-8 md:py-12 bg-almona-dark/40 rounded-xl sm:rounded-2xl">
      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-6 sm:mb-8 text-white px-2">Our Values</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8 container mx-auto px-4 sm:px-6">
        {values.map((value) => (
          <Card key={value.title} className="bg-almona-dark/60 border-almona-light/20 backdrop-blur-sm hover:border-almona-orange/50 transition-colors h-full">
            <CardHeader className="p-4 sm:p-5 md:p-6">
              <div className="flex items-start sm:items-center flex-col sm:flex-row">
                <CheckCircle className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-green-500 mb-2 sm:mb-0 sm:mr-3 md:mr-4 flex-shrink-0" />
                <CardTitle className="text-base sm:text-lg md:text-xl text-white leading-tight">{value.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-5 md:px-6 pb-4 sm:pb-5 md:pb-6 pt-0">
              <p className="text-xs sm:text-sm md:text-base text-gray-300 leading-relaxed">{value.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
