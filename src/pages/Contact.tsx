import { usePublicCopy } from '@/hooks/usePublicCopy';
import SEO from "@/components/SEO";
import { EmailDraftDownload } from '@/components/contact/EmailDraftDownload';
import { withErrorBoundary } from "@/hocs/withErrorBoundary";
import { Button } from "@/shared/ui/ui/button";
import { Input } from "@/shared/ui/ui/input";
import { Label } from "@/shared/ui/ui/label";
import { Textarea } from "@/shared/ui/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "react-router-dom";
import * as z from "zod";

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
  const copy = usePublicCopy();
  const location = useLocation();
  const [emailDraft, setEmailDraft] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { subject: new URLSearchParams(location.search).get('subject')?.slice(0, 120) || '' },
  });

  const onSubmit = useCallback((data: ContactFormValues) => {
    const body = `Name: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone}\n\n${data.message}`;
    setEmailDraft(`mailto:almona02@yahoo.com?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(body)}`);
  }, []);

  const currentUrl = useMemo(() => `https://www.almona02.com${location.pathname}`, [location.pathname]);

  const handleMapClick = useCallback(() => {
    window.open('https://share.google/Pah6FoMlL3e5MuGnq', '_blank');
  }, []);

  const handleNeighborhoodClick = useCallback(() => {
    window.open('/neighborhood-discovery.html', '_blank');
  }, []);

  return (
    <>
      <SEO
        title="Contact Us - Get in Touch | Almona Co."
        description="Contact Almona Co. for industrial machinery inquiries, technical support, and business partnerships. Official YILMAZ dealer in Egypt."
        url={currentUrl}
        keywords="contact Almona, industrial machinery contact, YILMAZ dealer contact Egypt"
      />
      <main className="flex-grow pt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="mb-16 text-center fade-in-up">
            <h1 className="typography-h1 mb-4">
              <span className="text-gradient-orange">{copy("Contact Us")}</span>
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto">{copy("Have questions or need assistance? Our team is ready to help you with any inquiries.")}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-almona-darker p-5 sm:p-8 rounded-xl border border-almona-light/20 fade-in-up">
              <h2 className="typography-h2 font-semibold mb-6">{copy("Send us a message")}</h2>

              <p className="text-gray-300 mb-6">{copy("Prepare your enquiry here, then send it from your email app to almona02@yahoo.com.")}</p>
              {emailDraft && (
                <div role="status" className="mb-6 p-4 bg-blue-900/30 border border-blue-500 rounded-lg">
                  <p className="text-gray-200">{copy("Your email draft is ready. Your message has not been sent. Open your email app to review and send it.")}</p>
                  <a href={emailDraft} className="inline-block mt-3 text-amber-400 underline">{copy("Open email draft")}</a>
                  <EmailDraftDownload mailto={emailDraft} />
                  <p className="mt-2 text-sm text-gray-300">{copy("No email app? Email almona02@yahoo.com directly or call +20 100 309 7177.")}</p>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} onChange={() => setEmailDraft(null)} className="space-y-6" noValidate>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="name" className="typography-label">{copy("Full Name")}</Label>
                    <Input
                      id="name"
                      className="mt-2 bg-almona-dark border-almona-light/30"
                      placeholder={copy("Your name")}
                      {...register("name")}
                    />
                    {errors.name && (
                      <p className="text-red-400 text-sm mt-1">
                        {copy(errors.name.message || "")}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email" className="typography-label">{copy("Email Address")}</Label>
                    <Input
                      id="email"
                      dir="ltr"
                      type="email"
                      className="mt-2 bg-almona-dark border-almona-light/30"
                      placeholder="you@example.com"
                      {...register("email")}
                    />
                    {errors.email && (
                      <p className="text-red-400 text-sm mt-1">
                        {copy(errors.email.message || "")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="phone" className="typography-label">{copy("Phone Number")}</Label>
                    <Input
                      id="phone"
                      type="tel"
                      dir="ltr"
                      className="mt-2 bg-almona-dark border-almona-light/30"
                      placeholder="+20XXXXXXXXXX"
                      {...register("phone")}
                    />
                    {errors.phone && (
                      <p className="text-red-400 text-sm mt-1">
                        {copy(errors.phone.message || "")}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="subject" className="typography-label">{copy("Subject")}</Label>
                    <Input
                      id="subject"
                      className="mt-2 bg-almona-dark border-almona-light/30"
                      placeholder={copy("How can we help?")}
                      {...register("subject")}
                    />
                    {errors.subject && (
                      <p className="text-red-400 text-sm mt-1">
                        {copy(errors.subject.message || "")}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="message" className="typography-label">{copy("Message")}</Label>
                  <Textarea
                    id="message"
                    className="mt-2 bg-almona-dark border-almona-light/30 min-h-[150px]"
                    placeholder={copy("Your message here...")}
                    {...register("message")}
                  />
                  {errors.message && (
                    <p className="text-red-400 text-sm mt-1">
                      {copy(errors.message.message || "")}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-orange hover:bg-almona-orange-dark text-white py-3"
                >{copy("Prepare Email")}</Button>
              </form>
            </div>

            {/* Contact Info & Map */}
            <div className="fade-in-up space-y-8"
            >
              <div className="bg-almona-darker p-5 sm:p-8 rounded-xl border border-almona-light/20">
                <h2 className="typography-h2 font-semibold mb-6">{copy("Contact Information")}</h2>

                <div className="space-y-6">
                  <div className="flex items-start">
                    <MapPin className="h-6 w-6 text-almona-orange me-4 mt-1" />
                    <div>
                      <h3 className="typography-h3 font-medium text-lg mb-1">{copy("Our Location")}</h3>
                      <p className="text-gray-400">{copy("ALMONA Co. 13B/18 Tarik Ibn Ziad st. Taawen , Haram , Giza, Egypt")}<br />{copy("Giza Governorate, Egypt")}</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Phone className="h-6 w-6 text-almona-orange me-4 mt-1" />
                    <div>
                      <h3 className="typography-h3 font-medium text-lg mb-1">{copy("Phone")}</h3>
                      <p className="text-gray-400">
                        +20 100 309 7177,
                        +20 102 800 3520
                        <br />
                        +20 235 856 305
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Mail className="h-6 w-6 text-almona-orange me-4 mt-1" />
                    <div>
                      <h3 className="typography-h3 font-medium text-lg mb-1">{copy("Email")}</h3>
                      <p className="text-gray-400">
                        almona02@yahoo.com
                        <br />
                        Info@almona.com
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Clock className="h-6 w-6 text-almona-orange me-4 mt-1" />
                    <div>
                      <h3 className="typography-h3 font-medium text-lg mb-1">{copy("Working Hours")}</h3>
                      <p className="text-gray-400">{copy("Saturday - Thursday: 10:00 AM - 8:00 PM")}<br />{copy("Friday: Closed")}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-almona-darker p-1 rounded-xl border border-almona-light/20 overflow-hidden">
                <div className="rounded-lg overflow-hidden h-80 relative group cursor-pointer" onClick={handleMapClick}>
                  {/* Map placeholder with location info */}
                  <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative">
                    <div className="text-center text-white">
                      <svg className="w-16 h-16 mx-auto mb-4 text-almona-orange" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      <h3 className="typography-h3 mb-2">{copy("Almona Industrial")}</h3>
                      <p className="text-gray-300 mb-4">{copy("Cairo, Egypt")}</p>
                      <p className="text-sm text-gray-400">{copy("Click to view on Google Maps")}</p>
                    </div>
                  </div>
                  
                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-almona-orange bg-opacity-90 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="text-center text-white">
                      <svg className="w-12 h-12 mx-auto mb-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      <p className="text-lg font-semibold">{copy("Open in Google Maps")}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Neighborhood Discovery Button */}
              <div className="mt-4 text-center">
                <Button variant="outline" className="w-full border-almona-light/30 hover:bg-almona-light/10" onClick={handleNeighborhoodClick}>{copy("Explore Our Neighborhood")}</Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default withErrorBoundary(Contact);
