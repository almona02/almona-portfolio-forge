const fs = require('fs');
const path = require('path');

// List of pages that need to be fixed
const pagesToFix = [
  'src/pages/About.tsx',
  'src/pages/Contact.tsx',
  'src/pages/Services.tsx',
  'src/pages/Shop.tsx',
  'src/pages/UsedMachines.tsx',
  'src/pages/SpareParts.tsx',
  'src/pages/Portfolio.tsx',
  'src/pages/Login.tsx',
  'src/pages/Register.tsx',
  'src/pages/CustomerPortal.tsx',
  'src/pages/QuotePage.tsx',
  'src/pages/FabricationServices.tsx',
  'src/pages/SellUsedMachine.tsx',
  'src/pages/RegisterMachinePage.tsx',
  'src/pages/CreateTicketPage.tsx',
  'src/pages/SupportNewTicketMenu.tsx',
  'src/pages/QuoteRequestPage.tsx'
];

function fixPage(filePath) {
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

    // Fix the main structure - remove the outer div wrapper and Navbar/Footer
    // Pattern: <div className="flex flex-col min-h-screen bg-almona-dark text-white">
    //          <Navbar />
    //          <main className="flex-grow pt-24"> or <main className="flex-grow">
    //          ...content...
    //          </main>
    //          <Footer />
    //          </div>

    const mainPattern = /<div className="flex flex-col min-h-screen bg-almona-dark text-white">\s*<Navbar \/>\s*<main className="flex-grow(?: pt-24)?">/g;
    if (mainPattern.test(content)) {
      content = content.replace(
        /<div className="flex flex-col min-h-screen bg-almona-dark text-white">\s*<Navbar \/>\s*<main className="flex-grow(?: pt-24)?">/g,
        '<main className="flex-grow pt-20">'
      );
      modified = true;
    }

    // Remove Footer and closing div
    const footerPattern = /<\/main>\s*<Footer \/>\s*<\/div>/g;
    if (footerPattern.test(content)) {
      content = content.replace(/<\/main>\s*<Footer \/>\s*<\/div>/g, '</main>');
      modified = true;
    }

    // Alternative pattern for pages that might have different structure
    const altPattern = /<div className="flex flex-col min-h-screen bg-almona-dark text-white">\s*<Navbar \/>\s*<main className="flex-grow">/g;
    if (altPattern.test(content)) {
      content = content.replace(
        /<div className="flex flex-col min-h-screen bg-almona-dark text-white">\s*<Navbar \/>\s*<main className="flex-grow">/g,
        '<main className="flex-grow pt-20">'
      );
      modified = true;
    }

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

console.log('🔧 Fixing pages to remove duplicate Navbar/Footer...\n');

let fixedCount = 0;
pagesToFix.forEach(page => {
  if (fs.existsSync(page)) {
    if (fixPage(page)) {
      fixedCount++;
    }
  } else {
    console.log(`⚠️  File not found: ${page}`);
  }
});

console.log(`\n🎉 Fixed ${fixedCount} pages!`);
