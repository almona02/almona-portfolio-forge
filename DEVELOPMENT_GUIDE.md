# ALMONA Development Guide

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18.0 or higher
- npm 8.0 or higher
- Git

### Installation Steps

1. **Clone the repository**
```bash
git clone [repository-url]
cd almona-portfolio-forge
```

2. **Install dependencies**
```bash
npm install
# or
bun install
```

3. **Start development server**
```bash
npm run dev
# Application will be available at http://localhost:5173
```

4. **Build for production**
```bash
npm run build
npm run preview  # Preview production build
```

## 🛠 Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm test` | Run all tests |
| `npm run test:ui` | Run tests with UI |
| `npm run lint` | Run ESLint |
| `npm run type-check` | TypeScript checking |
| `npm run format` | Format code with Prettier |

## 📁 Project Structure Guide

### Adding New Components
```bash
# Create new component
src/components/[category]/NewComponent.tsx

# Add tests
src/components/[category]/NewComponent.test.tsx

# Add stories (if applicable)
src/stories/NewComponent.stories.ts
```

### Adding New Pages
```bash
# Create new page
src/pages/NewPage.tsx

# Add route in App.tsx
<Route path="/new-page" element={<NewPage />} />
```

### Working with AI Features
- **Fault Detection**: Located in `src/lib/ai/faultDetection.ts`
- **Spare Parts AI**: Located in `src/lib/ai/SparePartsService.ts`
- **Configuration**: Update `src/lib/ai/config.ts`

### Internationalization
- **Translation files**: `locales/[lang]/[namespace].json`
- **Add new language**: Create new folder in `locales/`
- **Usage**: Use `useTranslation` hook

## 🧪 Testing Strategy

### Unit Tests
```bash
# Run specific test
npm test ComponentName

# Run with coverage
npm run test:coverage
```

### Integration Tests
```bash
# Run all integration tests
npm run test:integration
```

### E2E Tests
```bash
# Run E2E tests (if configured)
npm run test:e2e
```

## 🔧 Environment Variables

Create `.env` file:
```env
# Required
VITE_GOOGLE_CLOUD_API_KEY=your_google_cloud_key
VITE_TENSORFLOW_MODEL_URL=your_model_url

# Optional
VITE_API_BASE_URL=https://api.almona-egypt.com
VITE_DEBUG_MODE=false
```

## 📊 Performance Monitoring

### Lighthouse Scores
- **Performance**: 95+
- **Accessibility**: 95+
- **Best Practices**: 95+
- **SEO**: 95+

### Bundle Analysis
```bash
# Generate bundle report
npm run build
# Open bundle-stats.html in browser
```

## 🐛 Debugging Guide

### Common Issues

1. **TypeScript errors**
```bash
npm run type-check
```

2. **Build failures**
```bash
# Clear cache
rm -rf node_modules dist
npm install
npm run build
```

3. **Test failures**
```bash
# Run tests in watch mode
npm test -- --watch
```

### Development Tools
- **React DevTools**: Browser extension
- **Redux DevTools**: State debugging
- **Lighthouse**: Performance auditing

## 🚀 Deployment

### Production Build
```bash
npm run build
# Output in dist/ folder
```

### Environment Setup
- **Staging**: Automatic on push to develop
- **Production**: Automatic on push to main

## 📞 Support

- **Documentation**: See `docs/` folder
- **Issues**: GitHub Issues
- **Email**: dev@almona-egypt.com

## 🔄 Update Process

### Monthly Updates
1. Update dependencies
2. Run security audit
3. Update documentation
4. Performance review

### Quarterly Updates
1. Major dependency updates
2. Architecture review
3. Security assessment
4. Feature roadmap update

---
*Guide last updated: December 2024*
