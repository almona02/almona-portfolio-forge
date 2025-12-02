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
}

const SEO = ({
  title = 'Yilmaz Machines Egypt | Authorized Dealer | ALMONA Co.',
  description = 'Official authorized dealer of Yilmaz industrial machinery in Egypt. Industry 4.0 solutions including Fabricator Pro AI platform, CNC integration, smart manufacturing, and digital services for aluminium/UPVC fabricators.',
  keywords = 'Yilmaz Egypt, Yilmaz authorized dealer, Yilmaz machines Egypt, Yilmaz CNC, industrial machinery Egypt, aluminium fabrication Egypt, smart manufacturing Egypt, Industry 4.0 Egypt',
  image = '/logo.svg',
  url = import.meta.env.VITE_APP_URL || 'https://almona.eg',
  type = 'website',
  productData
}: SEOProps) => {
  const siteTitle = 'ALMONA Co. - Authorized Yilmaz Dealer';
  const fullTitle = title.includes(siteTitle) ? title : `${title} | ${siteTitle}`;
  
  // Prioritize specific product image for social sharing, fallback to provided image or default logo
  const socialImage = productData?.image || image;

  // Google Business Profile Link
  const googleBusinessProfile = 'https://share.google/Pah6FoMlL3e5MuGnq';

  // Dealer specific keywords
  const dealerKeywords = [
    // Primary dealer terms
    'Yilmaz authorized dealer Egypt',
    'Yilmaz official distributor Egypt',
    'Yilmaz machines Cairo',
    'Yilmaz CNC Egypt',
    'Yilmaz copy router Egypt',
    
    // Service terms
    'Yilmaz machine service Egypt',
    'Yilmaz spare parts Egypt',
    'Yilmaz training Egypt',
    'Yilmaz installation Egypt',
    
    // Industry-specific
    'aluminium machine Egypt',
    'UPVC machine Egypt',
    'window fabrication machine',
    'door manufacturing equipment',
    
    // Location specific
    'industrial machines Cairo',
    'factory equipment Egypt',
    'Egypt machinery supplier'
  ].join(', ');

  // Industry 4.0 comprehensive keywords
  const industry40Keywords = [
    'Industry 4.0', 'Smart Manufacturing', 'Digital Transformation', 'Industrial IoT', 'Cyber-Physical Systems',
    'AI-Powered Manufacturing', 'Machine Learning Optimization', 'Predictive Maintenance', 'Digital Twin',
    'Real-Time Analytics', 'Automated Quality Control', 'Intelligent Production Planning', 'CNC Integration',
    'Smart Factory', 'Connected Manufacturing', 'Data-Driven Production', 'Automated Workflows',
    'Self-Learning Systems', 'Adaptive Manufacturing', 'Remnant Marketplace', 'Calibration AI',
    'Constraint Programming', 'Genetic Algorithm Optimization', 'ML-Based Algorithm Selection',
    'Production Analytics', 'OEE Tracking', 'Workshop Performance Analytics', 'Material Optimization',
    'Waste Reduction AI', 'Cross-Project Optimization', 'Multi-Brand CNC Export', 'Machine Health Monitoring',
    'Sensor Data Analysis', 'Automated Workflow Generation', 'Computer Vision Quality Control',
    'Natural Language Processing', 'Equipment Recommendation AI', 'Consumption Forecasting',
    'Job Complexity Prediction', 'Workshop Intelligence', 'Production Intelligence'
  ].join(', ');

  // Digital Egypt & National Strategy keywords
  const digitalEgyptKeywords = [
    'Digital Egypt', 'Egypt Vision 2030', 'smart manufacturing Egypt', 'industrial digital transformation Egypt',
    'MCIT', 'ITIDA', 'G5 collaborative regulation', 'sustainable manufacturing', 'CO2 reduction',
    'SME productivity Egypt', 'national pilot project', 'Industry 4.0 Egypt', 'Egyptian manufacturing',
    'national industrial modernization', 'evidence-based industrial policy', 'Egypt AI strategy',
    'manufacturing productivity Egypt', 'circular economy Egypt', 'youth upskilling Egypt',
    'digital fabricator certification', 'national remnant marketplace'
  ].join(', ');

  const finalKeywords = `${keywords}, ${dealerKeywords}, ${industry40Keywords}, ${digitalEgyptKeywords}`;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={finalKeywords} />
      <meta name="author" content="ALMONA Co." />
      <meta name="robots" content="index, follow" />
      <meta name="language" content="ar" />
      <meta name="revisit-after" content="7 days" />
      
      {/* Industry 4.0 Specific Meta Tags */}
      <meta name="industry" content="Manufacturing, Construction, Industrial Machinery" />
      <meta name="technology" content="Industry 4.0, AI, Machine Learning, IoT, Digital Twin, Smart Manufacturing" />
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
          "url": "https://almona.eg",
          "telephone": "+201003097177",
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
          "openingHours": "Sa-Th 10:00-20:00",
          "areaServed": {
            "@type": "Country",
            "name": "Egypt"
          },
          "brand": {
            "@type": "Brand",
            "name": "Yilmaz Makina"
          },
          "knowsAbout": [
            "Yilmaz CNC Machines",
            "Yilmaz Copy Routers",
            "Yilmaz Cutting Machines",
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
            googleBusinessProfile,
            import.meta.env.VITE_FACEBOOK_URL,
            import.meta.env.VITE_LINKEDIN_URL,
            import.meta.env.VITE_INSTAGRAM_URL
          ].filter(Boolean),
          "knowsAbout": [
            "Industry 4.0",
            "Smart Manufacturing",
            "Artificial Intelligence",
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
            "image": productData.image,
            "sku": productData.sku,
            "brand": { "@type": "Brand", "name": productData.brand || "ALMONA" },
            "offers": {
              "@type": "Offer",
              "price": productData.price,
              "priceCurrency": productData.currency || "EGP",
              "availability": productData.availability ? `https://schema.org/${productData.availability}` : "https://schema.org/InStock"
            }
          })}
        </script>
      ) : (
        /* Default SoftwareApplication Schema if no specific product data */
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Fabricator Pro - Industry 4.0 Manufacturing Platform",
            "description": "AI-powered fabrication workflow system with self-learning optimization, CNC integration, predictive maintenance, and real-time analytics for aluminum/UPVC manufacturing",
            "applicationCategory": "Manufacturing Software",
            "operatingSystem": "Web Browser",
            "offers": {
              "@type": "Offer",
              "priceCurrency": "EGP",
              "availability": "https://schema.org/InStock"
            },
            "featureList": [
              "AI-Powered Workflow Cockpit with 7-step manufacturing pipeline",
              "ML-Powered Adaptive Solver (2.5x faster, 12% better waste reduction)",
              "Remnant-First Genetic Optimizer (15-30% waste reduction)",
              "Constraint Programming Glass Nesting (85-95% utilization)",
              "Predictive K-Factor Calibration with 94% accuracy",
              "Real-Time Production Monitoring with OEE Tracking",
              "Digital Twin Integration for Machine Lifecycle Tracking",
              "Multi-Brand CNC Export (Yilmaz, Elumatec, FOMM, Emmegi)",
              "Computer Vision Quality Control with Defect Detection",
              "Remnant Marketplace for Material Exchange",
              "Workshop Performance Analytics with Industry Benchmarking"
            ],
            "softwareVersion": "5.1"
          })}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
