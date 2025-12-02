
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper to load .env file manually since dotenv might not be available
function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envConfig = fs.readFileSync(envPath, 'utf8');
      envConfig.split('\n').forEach((line) => {
        const [key, value] = line.split('=');
        if (key && value) {
          process.env[key.trim()] = value.trim();
        }
      });
    }
  } catch (e) {
    console.warn('Could not load .env file, relying on process.env');
  }
}

loadEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.VITE_APP_URL || 'https://almona.eg';

const staticRoutes = [
  '',
  '/about',
  '/contact',
  '/services',
  '/shop',
  '/products',
  '/products/machines',
  '/products/3d-gallery',
  '/used-machines',
  '/fabricator-workflow',
  '/login',
  '/register'
];

function extractProductRoutes() {
  const routes = [];
  try {
    const machinesFilePath = path.resolve(process.cwd(), 'src/constants/yilmazMachines.ts');
    
    if (fs.existsSync(machinesFilePath)) {
      const content = fs.readFileSync(machinesFilePath, 'utf8');
      
      // Simple regex to extract IDs from the TS object structure
      // Matches id: "value" or id: 'value'
      const idRegex = /id:\s*["']([^"']+)["']/g;
      let match;
      
      while ((match = idRegex.exec(content)) !== null) {
        const id = match[1];
        if (id) {
          // Route structure from src/App.tsx: /products/machines/:machineId
          routes.push({
            url: `/products/machines/${id}`,
            lastMod: new Date().toISOString() // Using current date as fallback for static files
          });
        }
      }
      console.log(`📦 Extracted ${routes.length} machine routes from source code.`);
    } else {
      console.warn('⚠️ Could not find yilmazMachines.ts to generate product routes.');
    }
  } catch (error) {
    console.error('Error extracting product routes:', error);
  }
  return routes;
}

function generateSitemapXml(routes) {
  const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
  const urlSetStart = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
  const urlSetEnd = '</urlset>';

  const urlEntries = routes.map(route => {
    // Handle both string routes and object routes
    const urlPath = typeof route === 'string' ? route : route.url;
    const lastModDate = typeof route === 'object' && route.lastMod ? route.lastMod : new Date().toISOString();
    
    const loc = `${BASE_URL}${urlPath}`;
    const lastMod = `<lastmod>${lastModDate}</lastmod>`;
    const changeFreq = '<changefreq>weekly</changefreq>';
    const priority = '<priority>0.8</priority>';

    return `
  <url>
    <loc>${loc}</loc>
    ${lastMod}
    ${changeFreq}
    ${priority}
  </url>`;
  }).join('');

  return `${xmlHeader}
${urlSetStart}${urlEntries}
${urlSetEnd}`;
}

async function main() {
  console.log('🗺️ Generating sitemap...');
  
  const productRoutes = extractProductRoutes();
  const allRoutes = [...staticRoutes, ...productRoutes];
  
  const sitemap = generateSitemapXml(allRoutes);
  const publicDir = path.resolve(process.cwd(), 'public');
  
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
  }

  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap);
  console.log(`✅ Sitemap generated with ${allRoutes.length} routes at public/sitemap.xml`);
}

main().catch(console.error);
