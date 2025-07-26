import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
}

const SEO = ({
  title = 'ALMONA Co. - Industrial Machinery & Construction Materials',
  description = 'ALMONA Co. is a leading Egyptian industrial company established in 1991, specializing in YILMAZ machinery and ALFAPEN UPVC profiles for construction.',
  keywords = 'ALMONA, YILMAZ machines, ALFAPEN profiles, industrial machinery, construction materials, Egypt, aluminum processing, PVC processing',
  image = '/logo.png',
  url = import.meta.env.VITE_APP_URL || 'https://almona.eg',
  type = 'website'
}: SEOProps) => {
  const siteTitle = 'ALMONA Co.';
  const fullTitle = title.includes(siteTitle) ? title : `${title} | ${siteTitle}`;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content="ALMONA Co." />
      <meta name="robots" content="index, follow" />
      <meta name="language" content="ar" />
      <meta name="revisit-after" content="7 days" />

      {/* Open Graph Meta Tags */} 
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content={siteTitle} />
      <meta property="og:locale" content="ar_EG" />

      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Additional Meta Tags */}
      <meta name="theme-color" content="#FF5F1F" />
      <meta name="msapplication-TileColor" content="#FF5F1F" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content={siteTitle} />

      {/* Canonical URL */}
      <link rel="canonical" href={url} />

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "ALMONA Co.",
          "description": description,
          "url": url,
          "logo": image,
          "foundingDate": "1991",
          "address": {
            "@type": "PostalAddress",
            "addressCountry": "EG"
          },
          "contactPoint": {
            "@type": "ContactPoint",
            "email": import.meta.env.VITE_CONTACT_EMAIL || "info@almona.eg",
            "contactType": "customer service"
          },
          "sameAs": [
            import.meta.env.VITE_FACEBOOK_URL,
            import.meta.env.VITE_LINKEDIN_URL,
            import.meta.env.VITE_INSTAGRAM_URL
          ].filter(Boolean)
        })}
      </script>
    </Helmet>
  );
};

export default SEO;
