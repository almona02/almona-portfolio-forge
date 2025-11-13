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
    <div className="py-6 sm:py-8 md:py-12">
      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-6 sm:mb-8 text-white px-2">What Our Customers Say</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 container mx-auto px-4 sm:px-6">
        {testimonials.map((testimonial) => (
          <Card key={testimonial.name} className="bg-almona-dark/60 border-almona-light/20 backdrop-blur-sm hover:border-almona-orange/50 transition-colors h-full">
            <CardHeader className="p-4 sm:p-5 md:p-6">
              <div className="flex items-center">
                <Avatar className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 mr-3 sm:mr-4 flex-shrink-0">
                  <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                  <AvatarFallback className="text-sm sm:text-base md:text-lg">{testimonial.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm sm:text-base md:text-lg text-white mb-1 truncate">{testimonial.name}</CardTitle>
                  <p className="text-xs sm:text-sm md:text-base text-gray-400 truncate">{testimonial.company}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-5 md:px-6 pb-4 sm:pb-5 md:pb-6 pt-0">
              <div className="flex mb-3 sm:mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 fill-current" />
                ))}
              </div>
              <p className="text-xs sm:text-sm md:text-base text-gray-300 leading-relaxed">{testimonial.testimonial}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
