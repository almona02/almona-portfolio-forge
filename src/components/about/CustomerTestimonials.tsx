import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Ahmed Hassan",
    company: "Hassan & Sons Metalworks",
    avatar: "/images/profiles/ahmed-hassan.jpg",
    testimonial: "Almona's machines have transformed our production line. The quality and reliability are unmatched, and their support team is always there when we need them.",
    rating: 5,
  },
  {
    name: "Fatima Al-Sayed",
    company: "Al-Sayed UPVC Windows",
    avatar: "/images/profiles/fatima-al-sayed.jpg",
    testimonial: "We've been using Almona's equipment for over a decade. Their commitment to innovation and customer satisfaction is why we keep coming back.",
    rating: 5,
  },
  {
    name: "Mustafa Mahmoud",
    company: "Mahmoud Aluminum Profiles",
    avatar: "/images/profiles/mustafa-mahmoud.jpg",
    testimonial: "The precision and efficiency of Almona's machines have allowed us to take on bigger and more complex projects. They are a true partner in our success.",
    rating: 5,
  },
];

export const CustomerTestimonials = () => {
  return (
    <div className="py-12">
      <h2 className="text-3xl font-bold text-center mb-8">What Our Customers Say</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {testimonials.map((testimonial) => (
          <Card key={testimonial.name}>
            <CardHeader>
              <div className="flex items-center">
                <Avatar className="w-12 h-12 mr-4">
                  <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                  <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>{testimonial.name}</CardTitle>
                  <p className="text-muted-foreground">{testimonial.company}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-500 fill-current" />
                ))}
              </div>
              <p>{testimonial.testimonial}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
