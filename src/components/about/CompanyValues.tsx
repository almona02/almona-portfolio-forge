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
    <div className="py-12 bg-secondary">
      <h2 className="text-3xl font-bold text-center mb-8">Our Values</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 container">
        {values.map((value) => (
          <Card key={value.title}>
            <CardHeader>
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-500 mr-4" />
                <CardTitle>{value.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p>{value.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
