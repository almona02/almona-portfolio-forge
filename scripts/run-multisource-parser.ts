/**
 * Run MultiSourceParser on codebase to extract code structure
 */

import { MultiSourceParser } from '../src/lib/ydt/parsers/MultiSourceParser';
import * as fs from 'fs';

async function main() {
  console.log('🚀 Starting MultiSourceParser on codebase...\n');
  
  const parser = new MultiSourceParser();
  
  try {
    // Parse code files
    console.log('📝 Parsing code files (TypeScript, Python, JavaScript)...');
    const result = await parser.parseSources(['code']);
    
    console.log('\n✅ Parsing complete!');
    console.log(`\n📊 Statistics:`);
    console.log(`   Total files: ${result.statistics.totalFiles}`);
    console.log(`   By type:`, result.statistics.byType);
    console.log(`   Total lines: ${result.statistics.totalLines.toLocaleString()}`);
    console.log(`   Total words: ${result.statistics.totalWords.toLocaleString()}`);
    console.log(`   Errors: ${result.statistics.errors}`);
    
    // Show sample results
    console.log(`\n📄 Sample parsed sources (first 5):`);
    result.sources.slice(0, 5).forEach((source, index) => {
      console.log(`\n   ${index + 1}. ${source.filePath}`);
      console.log(`      Type: ${source.type}`);
      console.log(`      Language: ${source.metadata.language || 'N/A'}`);
      console.log(`      Lines: ${source.metadata.lines || 'N/A'}`);
      console.log(`      Sections: ${source.sections?.length || 0}`);
      if (source.sections && source.sections.length > 0) {
        console.log(`      First section: ${source.sections[0].title}`);
      }
    });
    
    // Save results to JSON
    const outputPath = 'src/lib/ydt/code-structure.json';
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`\n💾 Results saved to: ${outputPath}`);
    console.log(`   Size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error running MultiSourceParser:', error);
    process.exit(1);
  }
}

main();

