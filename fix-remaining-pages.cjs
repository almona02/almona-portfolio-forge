const fs = require('fs');
const path = require('path');

// List of pages that still need fixing
const pagesToFix = [
  'src/pages/CreateTicketPage.tsx',
  'src/pages/RegisterMachinePage.tsx',
  'src/pages/SupportNewTicketMenu.tsx',
  'src/pages/QuoteRequestPage.tsx',
  'src/pages/QuotePage.tsx',
  'src/pages/FabricationServices.tsx',
  'src/pages/SpareParts.tsx',
  'src/pages/UsedMachines.tsx',
  'src/pages/Shop.tsx',
  'src/pages/Contact.tsx',
  'src/pages/About.tsx',
  'src/pages/Portfolio.tsx'
];

function fixPageStructure(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Remove Navbar import
    if (content.includes('import Navbar from "@/components/layout/Navbar";')) {
      content = content.replace(/import Navbar from "@\/components\/layout\/Navbar";\n?/g, '');
      modified = true;
    }

    // Remove Footer import
    if (content.includes('import Footer from "@/components/layout/Footer";')) {
      content = content.replace(/import Footer from "@\/components\/layout\/Footer";\n?/g, '');
      modified = true;
    }

    // Fix the main structure patterns
    const patterns = [
      // Pattern 1: <div className="flex flex-col min-h-screen bg-almona-dark text-white">
      //           <Navbar />
      //           <main className="flex-grow pt-24">
      {
        search: /<div className="flex flex-col min-h-screen bg-almona-dark text-white">\s*<Navbar \/>\s*<main className="flex-grow pt-24">/g,
        replace: '<>\n      <main className="flex-grow pt-20">'
      },
      // Pattern 2: <div className="flex flex-col min-h-screen bg-almona-dark text-white">
      //           <Navbar />
      //           <main className="flex-grow">
      {
        search: /<div className="flex flex-col min-h-screen bg-almona-dark text-white">\s*<Navbar \/>\s*<main className="flex-grow">/g,
        replace: '<>\n      <main className="flex-grow pt-20">'
      },
      // Pattern 3: <div className="flex flex-col min-h-screen bg-almona-dark">
      //           <Navbar />
      //           <main className="flex-grow pt-24">
      {
        search: /<div className="flex flex-col min-h-screen bg-almona-dark">\s*<Navbar \/>\s*<main className="flex-grow pt-24">/g,
        replace: '<>\n      <main className="flex-grow pt-20">'
      },
      // Pattern 4: <div className="flex flex-col min-h-screen bg-almona-dark">
      //           <Navbar />
      //           <main className="flex-grow">
      {
        search: /<div className="flex flex-col min-h-screen bg-almona-dark">\s*<Navbar \/>\s*<main className="flex-grow">/g,
        replace: '<>\n      <main className="flex-grow pt-20">'
      }
    ];

    // Apply patterns
    patterns.forEach(pattern => {
      if (pattern.search.test(content)) {
        content = content.replace(pattern.search, pattern.replace);
        modified = true;
      }
    });

    // Fix closing patterns
    const closingPatterns = [
      // Pattern 1: </main>
      //           <Footer />
      //           </div>
      {
        search: /<\/main>\s*<Footer \/>\s*<\/div>/g,
        replace: '</main>\n    </>'
      },
      // Pattern 2: </main>
      //           </div>
      {
        search: /<\/main>\s*<\/div>/g,
        replace: '</main>\n    </>'
      }
    ];

    // Apply closing patterns
    closingPatterns.forEach(pattern => {
      if (pattern.search.test(content)) {
        content = content.replace(pattern.search, pattern.replace);
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    } else {
      console.log(`⏭️  No changes needed: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

console.log('🔧 Fixing remaining pages...\n');

let fixedCount = 0;
pagesToFix.forEach(page => {
  if (fs.existsSync(page)) {
    if (fixPageStructure(page)) {
      fixedCount++;
    }
  } else {
    console.log(`⚠️  File not found: ${page}`);
  }
});

console.log(`\n🎉 Fixed ${fixedCount} pages!`);
