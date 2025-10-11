import React from 'react';
import { Helmet } from 'react-helmet-async';
import { UsedMachine } from '@/data/usedMachines';

interface MachineSEOProps {
  machine?: UsedMachine;
  machines?: UsedMachine[];
  isListingPage?: boolean;
}

/**
 * MachineSEO Component
 * 
 * Provides comprehensive SEO optimization for machinery pages including:
 * - Meta tags for social sharing
 * - JSON-LD structured data for search engines
 * - Open Graph and Twitter Card markup
 * - Machinery-specific Schema.org markup
 */
const MachineSEO: React.FC<MachineSEOProps> = ({ 
  machine, 
  machines = [], 
  isListingPage = false 
}) => {
  
  // Generate structured data for individual machine
  const generateMachineStructuredData = (machine: UsedMachine) => {
    // Extract numeric price for structured data
    const numericPrice = machine.price.replace(/[^\d]/g, '');
    
    return {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": machine.title,
      "description": machine.description,
      "brand": {
        "@type": "Brand",
        "name": "Industrial Machinery"
      },
      "category": "Industrial Equipment",
      "condition": "https://schema.org/UsedCondition",
      "image": machine.images.map(img => `https://www.almona02.com${img}`),
      "offers": {
        "@type": "Offer",
        "price": numericPrice,
        "priceCurrency": "EGP",
        "availability": "https://schema.org/InStock",
        "seller": {
          "@type": "Organization",
          "name": machine.seller.name,
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": machine.seller.rating,
            "bestRating": 5
          }
        },
        "itemLocation": {
          "@type": "Place",
          "name": machine.location,
          "address": {
            "@type": "PostalAddress",
            "addressRegion": machine.location,
            "@country": "EG"
          }
        }
      },
      "additionalProperty": [
        {
          "@type": "PropertyValue",
          "name": "Year",
          "value": machine.year.toString()
        },
        {
          "@type": "PropertyValue", 
          "name": "Operating Hours",
          "value": machine.hours.toString()
        },
        {
          "@type": "PropertyValue",
          "name": "Machine Type",
          "value": machine.type
        }
      ],
      "manufacturer": {
        "@type": "Organization",
        "name": "Industrial Equipment Manufacturer"
      }
    };
  };

  // Generate structured data for machinery listings page
  const generateListingStructuredData = () => {
    return {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": "Used Industrial Machinery - Egypt",
      "description": "Browse and buy verified used aluminum and uPVC machinery in Egypt. CNC centers, cutting machines, welding equipment and more.",
      "url": "https://www.almona02.com/used-machines",
      "mainEntity": {
        "@type": "ItemList",
        "numberOfItems": machines.length,
        "itemListElement": machines.map((machine, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "item": generateMachineStructuredData(machine)
        }))
      },
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://www.almona02.com"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Used Machines",
            "item": "https://www.almona02.com/used-machines"
          }
        ]
      }
    };
  };

  // SEO content for individual machine page
  if (machine && !isListingPage) {
    const machineTitle = `${machine.title} - Used Industrial Machinery in ${machine.location}`;
    const machineDescription = `${machine.description} Year: ${machine.year}, Hours: ${machine.hours.toLocaleString()}. Price: ${machine.price}. Contact verified seller ${machine.seller.name} in ${machine.location}, Egypt.`;
    
    return (
      <Helmet>
        {/* Primary Meta Tags */}
        <title>{machineTitle}</title>
        <meta name="description" content={machineDescription} />
        <meta name="keywords" content={`used machinery, ${machine.type}, industrial equipment, ${machine.location}, Egypt, aluminum machinery, CNC, manufacturing equipment`} />
        <link rel="canonical" href={`https://www.almona02.com/used-machines/${machine.id}`} />

        {/* Open Graph */}
        <meta property="og:type" content="product" />
        <meta property="og:title" content={machineTitle} />
        <meta property="og:description" content={machineDescription} />
        <meta property="og:image" content={`https://www.almona02.com${machine.images[0]}`} />
        <meta property="og:url" content={`https://www.almona02.com/used-machines/${machine.id}`} />
        <meta property="og:site_name" content="Almona Industrial" />
        <meta property="product:condition" content="used" />
        <meta property="product:price:amount" content={machine.price.replace(/[^\d]/g, '')} />
        <meta property="product:price:currency" content="EGP" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={machineTitle} />
        <meta name="twitter:description" content={machineDescription} />
        <meta name="twitter:image" content={`https://www.almona02.com${machine.images[0]}`} />

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(generateMachineStructuredData(machine), null, 2)}
        </script>

        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      </Helmet>
    );
  }

  // SEO content for machinery listing page
  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>Used Industrial Machinery for Sale in Egypt - Verified Sellers | Almona</title>
      <meta name="description" content="Browse verified used aluminum and uPVC machinery in Egypt. CNC centers, cutting machines, welding equipment. Trusted sellers, secure transactions, technical inspections." />
      <meta name="keywords" content="used machinery Egypt, industrial equipment, aluminum machinery, CNC machines, cutting machines, welding equipment, manufacturing tools, verified sellers" />
      <link rel="canonical" href="https://www.almona02.com/used-machines" />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content="Used Industrial Machinery Marketplace - Egypt" />
      <meta property="og:description" content="Trusted platform for buying and selling used industrial machinery in Egypt. Browse verified equipment from aluminum and uPVC fabricators." />
      <meta property="og:image" content="https://www.almona02.com/images/machinery-marketplace-og.jpg" />
      <meta property="og:url" content="https://www.almona02.com/used-machines" />
      <meta property="og:site_name" content="Almona Industrial" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Used Industrial Machinery Marketplace - Egypt" />
      <meta name="twitter:description" content="Browse and buy verified used machinery from trusted sellers in Egypt." />
      <meta name="twitter:image" content="https://www.almona02.com/images/machinery-marketplace-twitter.jpg" />

      {/* JSON-LD Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(generateListingStructuredData(), null, 2)}
      </script>

      {/* Additional SEO */}
      <meta name="robots" content="index, follow" />
      <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      
      {/* Hreflang for multi-language support */}
      <link rel="alternate" hrefLang="en" href="https://www.almona02.com/used-machines" />
      <link rel="alternate" hrefLang="ar" href="https://www.almona02.com/ar/used-machines" />
      <link rel="alternate" hrefLang="fr" href="https://www.almona02.com/fr/used-machines" />
      <link rel="alternate" hrefLang="de" href="https://www.almona02.com/de/used-machines" />
    </Helmet>
  );
};

export default MachineSEO;