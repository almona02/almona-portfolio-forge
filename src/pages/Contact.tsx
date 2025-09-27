import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/shared/ui/ui/button";
import { Input } from "@/shared/ui/ui/input";
import { Textarea } from "@/shared/ui/ui/textarea";
import { Label } from "@/shared/ui/ui/label";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { withErrorBoundary } from "@/hocs/withErrorBoundary";
import { motion } from "framer-motion";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z
    .string()
    .regex(/^\+20[0-9]{10}$/, "Phone must be +20 followed by 10 digits"),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormValues = z.infer<typeof contactSchema>;

const Contact = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = (_data: ContactFormValues) => {
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitSuccess(true);
      // Reset form after 3 seconds
      setTimeout(() => setSubmitSuccess(false), 3000);
    }, 1500);
  };

  return (
    <main className="flex-grow pt-20">
        <div className="container mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-16 text-center"
          >
            <h1 className="text-4xl font-bold mb-4">
              <span className="text-gradient-orange">Contact Us</span>
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Have questions or need assistance? Our team is ready to help you
              with any inquiries.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-almona-darker p-8 rounded-xl border border-almona-light/20"
            >
              <h2 className="text-2xl font-semibold mb-6">Send us a message</h2>

              {submitSuccess && (
                <div className="mb-6 p-4 bg-green-900/30 border border-green-500 rounded-lg">
                  <p className="text-green-400">
                    Your message has been sent successfully!
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      className="mt-2 bg-almona-dark border-almona-light/30"
                      placeholder="Your name"
                      {...register("name")}
                    />
                    {errors.name && (
                      <p className="text-red-400 text-sm mt-1">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      className="mt-2 bg-almona-dark border-almona-light/30"
                      placeholder="you@example.com"
                      {...register("email")}
                    />
                    {errors.email && (
                      <p className="text-red-400 text-sm mt-1">
                        {errors.email.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      className="mt-2 bg-almona-dark border-almona-light/30"
                      placeholder="+20XXXXXXXXXX"
                      {...register("phone")}
                    />
                    {errors.phone && (
                      <p className="text-red-400 text-sm mt-1">
                        {errors.phone.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      className="mt-2 bg-almona-dark border-almona-light/30"
                      placeholder="How can we help?"
                      {...register("subject")}
                    />
                    {errors.subject && (
                      <p className="text-red-400 text-sm mt-1">
                        {errors.subject.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    className="mt-2 bg-almona-dark border-almona-light/30 min-h-[150px]"
                    placeholder="Your message here..."
                    {...register("message")}
                  />
                  {errors.message && (
                    <p className="text-red-400 text-sm mt-1">
                      {errors.message.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-orange hover:bg-almona-orange-dark text-white py-3"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Sending..." : "Send Message"}
                </Button>
              </form>
            </motion.div>

            {/* Contact Info & Map */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="space-y-8"
            >
              <div className="bg-almona-darker p-8 rounded-xl border border-almona-light/20">
                <h2 className="text-2xl font-semibold mb-6">
                  Contact Information
                </h2>

                <div className="space-y-6">
                  <div className="flex items-start">
                    <MapPin className="h-6 w-6 text-almona-orange mr-4 mt-1" />
                    <div>
                      <h3 className="font-medium text-lg mb-1">Our Location</h3>
                      <p className="text-gray-400">
                        ALMONA Co. 13B/18 Tarik Ibn Ziad st. Taawen , Haram ,
                        Giza, Egypt
                        <br />
                        Giza Governorate, Egypt
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Phone className="h-6 w-6 text-almona-orange mr-4 mt-1" />
                    <div>
                      <h3 className="font-medium text-lg mb-1">Phone</h3>
                      <p className="text-gray-400">
                        +20 100 309 7177
                        <br />
                        +20 235 856 305
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Mail className="h-6 w-6 text-almona-orange mr-4 mt-1" />
                    <div>
                      <h3 className="font-medium text-lg mb-1">Email</h3>
                      <p className="text-gray-400">
                        almona02@yahoo.com
                        <br />
                        Info@almona.com
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Clock className="h-6 w-6 text-almona-orange mr-4 mt-1" />
                    <div>
                      <h3 className="font-medium text-lg mb-1">
                        Working Hours
                      </h3>
                      <p className="text-gray-400">
                        Saturday - Thursday: 10:00 AM - 8:00 PM
                        <br />
                        Friday: Closed
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-almona-darker p-1 rounded-xl border border-almona-light/20 overflow-hidden">
                <div className="rounded-lg overflow-hidden h-80 relative group cursor-pointer" onClick={() => window.open('https://www.google.com/maps/place/Yilmaz+machine/@29.997034,31.1610963,17z/data=!3m1!4b1!4m6!3m5!1s0x1458452786e7c71d:0x3b8c19b580db70e!8m2!3d29.997034!4d31.1636712!16s%2Fg%2F11nn4nvz79?entry=ttu', '_blank')}>
                  {/* Map placeholder with location info */}
                  <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative">
                    <div className="text-center text-white">
                      <svg className="w-16 h-16 mx-auto mb-4 text-almona-orange" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      <h3 className="text-xl font-semibold mb-2">Almona Industrial</h3>
                      <p className="text-gray-300 mb-4">Cairo, Egypt</p>
                      <p className="text-sm text-gray-400">Click to view on Google Maps</p>
                    </div>
                  </div>
                  
                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-almona-orange bg-opacity-90 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="text-center text-white">
                      <svg className="w-12 h-12 mx-auto mb-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      <p className="text-lg font-semibold">Open in Google Maps</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
  );
};

export default withErrorBoundary(Contact);
