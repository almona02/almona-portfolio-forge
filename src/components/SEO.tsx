import { Helmet } from 'react-helmet-async';

interface ProductData {
  name: string;
  description: string;
  price?: string;
  currency?: string;
  sku?: string;
  brand?: string;
  image?: string;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
}

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  productData?: ProductData;
  noindex?: boolean;
}

const SEO = ({
  title = 'YILMAZ Machinery Egypt & Fabricator Pro | Almona',
  description = 'ALMONA supplies YILMAZ machinery in Egypt and Fabricator Pro for aluminium and UPVC fabrication, with machinery maintenance, training and support.',
  keywords = 'Yilmaz Egypt, Yilmaz authorized dealer, Yilmaz machines Egypt, Yilmaz CNC, industrial machinery Egypt, aluminium fabrication Egypt, smart manufacturing Egypt, Industry 4.0 Egypt, منشار, منشار طبلية, منشار طبليه, فريزة موبينه, فريزة موتور, فريزة, ماكينة سقاس, ماكينة لحام, لحام بي في سي, لحام upvc, لحام pvc, يلمز, يلماز, ديسك رأسي, ديسك يلمز, ديسك المز, مصنع الومنيوم, مكن الوميتال, مكن الومنيوم, خط انتاج, مصنع بي في سي, مكن بي في سي',
  image = '/logo.svg',
  url = String(import.meta.env.VITE_APP_URL || 'https://www.almona02.com'),
  type = 'website',
  productData,
  noindex = false
}: SEOProps) => {
  const siteTitle = 'Almona';
  const fullTitle = title.includes('Almona') ? title : `${title} | ${siteTitle}`;

  // Prioritize specific product image for social sharing, fallback to provided image or default logo
  const siteOrigin = String(import.meta.env.VITE_APP_URL || 'https://www.almona02.com');
  const socialImage = new URL(productData?.image || image, siteOrigin).href;

  // Google Business Profile Link
  const googleBusinessProfile = 'https://share.google/Pah6FoMlL3e5MuGnq';

  const finalKeywords = keywords;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={finalKeywords} />
      <meta name="author" content="ALMONA Co." />
      <meta name="robots" content={noindex ? "noindex, follow" : "index, follow"} />
      <meta name="language" content="ar" />
      <meta name="revisit-after" content="7 days" />

      {/* Industry 4.0 Specific Meta Tags */}
      <meta name="industry" content="Manufacturing, Construction, Industrial Machinery" />
      <meta name="technology" content="Industry 4.0, automation, Machine Learning, IoT, Digital Twin, Smart Manufacturing" />
      <meta name="application-category" content="Industrial Software, Manufacturing Platform, ERP" />
      <meta name="target-audience" content="Manufacturers, Fabricators, Industrial Companies, Construction Companies" />

      {/* Open Graph Meta Tags */} 
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={socialImage} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content={siteTitle} />
      <meta property="og:locale" content="ar_EG" />

      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={socialImage} />

      {/* Additional Meta Tags */}
      <meta name="theme-color" content="#FF5F1F" />
      <meta name="msapplication-TileColor" content="#FF5F1F" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content={siteTitle} />

      {/* Canonical URL */}
      <link rel="canonical" href={url} />

      {/* Structured Data - Local Business (Dealer) */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "name": "ALMONA Co. - Authorized Yilmaz Dealer",
          "description": "Official authorized dealer of Yilmaz industrial machinery in Egypt",
          "url": "https://www.almona02.com",
          "telephone": "+201003097177",
          "contactPoint": [
            {
              "@type": "ContactPoint",
              "telephone": "+201000355135",
              "contactType": "sales",
              "areaServed": "EG",
              "availableLanguage": ["ar", "en"],
              "url": "https://wa.me/201000355135"
            }
          ],
          "hasMap": googleBusinessProfile,
          "sameAs": [
            googleBusinessProfile,
            import.meta.env.VITE_FACEBOOK_URL,
            import.meta.env.VITE_LINKEDIN_URL,
            import.meta.env.VITE_INSTAGRAM_URL
          ].filter(Boolean),
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "13B/18 Tarik Ibn Ziad st. Taawen , Haram",
            "addressLocality": "Giza",
            "addressRegion": "Giza Governorate",
            "postalCode": "12111",
            "addressCountry": "EG"
          },
          "priceRange": "$$$",
          "areaServed": {
            "@type": "Country",
            "name": "Egypt"
          },
          "brand": {
            "@type": "Brand",
            "name": "Yilmaz Makina"
          },
          "geo": {
            "@type": "GeoCoordinates",
            "latitude": 29.9870,
            "longitude": 31.2118
          },
          "knowsAbout": [
            "Yilmaz CNC Machines",
            "Yilmaz Copy Routers",
            "Yilmaz Cutting Machines",
            "Yilmaz Welding Machines",
            "منشار ألمنيوم",
            "فريزة ألمنيوم",
            "ماكينة سقاس",
            "ماكينة لحام PVC",
            "Industrial Machinery Egypt"
          ]
        })}
      </script>

      {/* Structured Data - Organization */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "ALMONA Co.",
          "slogan": "Precision at the Heart of Industry",
          "description": description,
          "url": url,
          "logo": socialImage,
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
            googleBusinessProfile,
            import.meta.env.VITE_FACEBOOK_URL,
            import.meta.env.VITE_LINKEDIN_URL,
            import.meta.env.VITE_INSTAGRAM_URL
          ].filter(Boolean),
          "knowsAbout": [
            "Industry 4.0",
            "Smart Manufacturing",
            "software assistance",
            "Machine Learning",
            "Digital Twin",
            "Predictive Maintenance",
            "CNC Machining",
            "Aluminum Fabrication",
            "UPVC Processing",
            "Industrial Automation"
          ]
        })}
      </script>

      {/* Structured Data - Dynamic Product Data */}
      {productData ? (
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": productData.name,
            "description": productData.description,
            "image": socialImage,
            "sku": productData.sku,
            "brand": { "@type": "Brand", "name": productData.brand || "ALMONA" },
            "offers": productData.price && productData.currency ? {
              "@type": "Offer",
              "price": productData.price,
              "priceCurrency": productData.currency || "EGP",
              "availability": productData.availability ? `https://schema.org/${productData.availability}` : undefined
            } : undefined
          })}
        </script>
      ) : (
        /* Default SoftwareApplication Schema if no specific product data */
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Fabricator Pro",
            "description": "Web workspace for aluminium and UPVC fabrication: measurement, position design, bills of materials, stock optimization, quoting and production documents.",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web Browser",
            "featureList": [
              "Project and position management",
              "Measurement, design and drafting",
              "Bills of materials and stock optimization",
              "Quotes and workshop reports",
              "Production and quality-control workflows",
              "Arabic and English interfaces"
            ]
          })}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
