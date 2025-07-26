# AI Equipment Advisor

## Features
- Gemini AI-powered equipment recommendations
- Egyptian market-specific suggestions
- Wizard-style interface
- Budget-conscious filtering
- Workshop layout planning

## Setup
1. Add API keys to `.env`:
```env
VITE_GEMINI_KEY=your_google_api_key
```

2. Install dependencies:
```bash
npm install @google/generative-ai
```

## Usage
The advisor will:
1. Collect workshop requirements
2. Consider Egyptian market conditions
3. Provide tailored equipment recommendations
4. Suggest optimal workshop layouts

## Configuration
Edit `src/lib/ai/gemini.ts` to adjust:
- Egyptian market parameters
- Response formatting
- Error handling

## Testing
Run the component and verify:
- AI responses are relevant
- Egyptian context is applied
- Error states are handled gracefully
