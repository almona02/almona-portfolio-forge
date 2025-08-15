import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/shared/ui/ui/button";
import { Input } from "@/shared/ui/ui/input";
import { Textarea } from "@/shared/ui/ui/textarea";
import { Label } from "@/shared/ui/ui/label";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { motion } from "framer-motion";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^\+20[0-9]{10}$/, "Phone must be +20 followed by 10 digits"),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormValues = z.infer<typeof contactSchema>;

const Contact = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = (data: ContactFormValues) => {
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
    <div className="flex flex-col min-h-screen bg-almona-dark text-white">
      <Navbar />
      <main className="flex-grow pt-24">
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
              Have questions or need assistance? Our team is ready to help you with any inquiries.
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
                  <p className="text-green-400">Your message has been sent successfully!</p>
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
                      {...register('name')}
                    />
                    {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>}
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      className="mt-2 bg-almona-dark border-almona-light/30" 
                      placeholder="you@example.com"
                      {...register('email')}
                    />
                    {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input 
                      id="phone" 
                      className="mt-2 bg-almona-dark border-almona-light/30" 
                      placeholder="+20XXXXXXXXXX"
                      {...register('phone')}
                    />
                    {errors.phone && <p className="text-red-400 text-sm mt-1">{errors.phone.message}</p>}
                  </div>
                  
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input 
                      id="subject" 
                      className="mt-2 bg-almona-dark border-almona-light/30" 
                      placeholder="How can we help?"
                      {...register('subject')}
                    />
                    {errors.subject && <p className="text-red-400 text-sm mt-1">{errors.subject.message}</p>}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea 
                    id="message" 
                    className="mt-2 bg-almona-dark border-almona-light/30 min-h-[150px]" 
                    placeholder="Your message here..."
                    {...register('message')}
                  />
                  {errors.message && <p className="text-red-400 text-sm mt-1">{errors.message.message}</p>}
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
                <h2 className="text-2xl font-semibold mb-6">Contact Information</h2>
                
                <div className="space-y-6">
                  <div className="flex items-start">
                    <MapPin className="h-6 w-6 text-almona-orange mr-4 mt-1" />
                    <div>
                      <h3 className="font-medium text-lg mb-1">Our Location</h3>
                      <p className="text-gray-400">
                        15th Industrial Zone, 6th of October City<br />
                        Giza Governorate, Egypt
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Phone className="h-6 w-6 text-almona-orange mr-4 mt-1" />
                    <div>
                      <h3 className="font-medium text-lg mb-1">Phone</h3>
                      <p className="text-gray-400">
                        +20 100 123 4567<br />
                        +20 155 987 6543
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Mail className="h-6 w-6 text-almona-orange mr-4 mt-1" />
                    <div>
                      <h3 className="font-medium text-lg mb-1">Email</h3>
                      <p className="text-gray-400">
                        info@almona.com<br />
                        support@almona.com
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Clock className="h-6 w-6 text-almona-orange mr-4 mt-1" />
                    <div>
                      <h3 className="font-medium text-lg mb-1">Working Hours</h3>
                      <p className="text-gray-400">
                        Sunday - Thursday: 8:00 AM - 5:00 PM<br />
                        Friday & Saturday: Closed
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-almona-darker p-1 rounded-xl border border-almona-light/20 overflow-hidden">
                <div className="rounded-lg overflow-hidden h-80">
                  <iframe
                    title="Almona Location"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3458.215826123969!2d30.95079731511479!3d29.937155981921395!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1458576f6c3d13a7%3A0x3a0f0d7f0d4f4b4f!2s6th%20of%20October%20City%2C%20Giza%20Governorate!5e0!3m2!1sen!2seg!4v1651234567890!5m2!1sen!2seg"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;