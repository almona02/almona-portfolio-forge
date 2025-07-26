// Quick test to verify portfolioData import and structure
import { portfolioData } from './src/data/portfolioData.js';

console.log('Testing portfolioData structure...');
console.log('Projects count:', portfolioData.projects.length);
console.log('Skills count:', portfolioData.skills.length);
console.log('Testimonials count:', portfolioData.testimonials.length);

// Verify project structure
const firstProject = portfolioData.projects[0];
console.log('First project has required fields:', {
  hasId: 'id' in firstProject,
  hasTitle: 'title' in firstProject,
  hasDescription: 'description' in firstProject,
  hasImageUrl: 'imageUrl' in firstProject,
  hasTags: 'tags' in firstProject,
  hasLink: 'link' in firstProject
});

console.log('✅ portfolioData structure test completed successfully');
