import { GoogleGenerativeAI } from "@google/generative-ai";

const geminiKey = import.meta.env.VITE_GEMINI_KEY;
const genAI = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;

export const EGYPTIAN_MARKET_CONTEXT = `

Egyptian Market Considerations:
- Power: 220V single/three-phase
- Common material thickness: 1.5mm-8mm aluminum/UPVC
- Workshop conditions: High dust/sand exposure
- Typical workshop size: 50-100 sqm
- Budget ranges: 
  - Small: 50,000-150,000 EGP 
  - Medium: 150,000-300,000 EGP
  - Large: 300,000+ EGP
- Popular brands: YILMAZ, ALFAPEN, Kaban
`;

export const getEquipmentRecommendation = async (query: string) => {
  if (!genAI) {
    return 'AI service not configured. Please contact support.';
  }
  
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  
  const prompt = `${EGYPTIAN_MARKET_CONTEXT}
  
  As an expert advisor for Egyptian aluminum/UPVC fabricators, provide detailed equipment recommendations for:
  ${query}

  Format response with:
  1. Top 3 recommended machines with model numbers
  2. Justification for each recommendation
  3. Power requirements (220V compatible)
  4. Space needed
  5. Price range in EGP
  6. Local availability in Egypt`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Gemini API error:', error);
    return 'Unable to generate recommendations at this time.';
  }
};

export const getWorkshopLayout = async (requirements: string) => {
  if (!genAI) {
    return 'AI service not configured. Please contact support.';
  }
  
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  
  const prompt = `${EGYPTIAN_MARKET_CONTEXT}
  
  Design an optimal workshop layout for:
  ${requirements}

  Include:
  1. Machine placement diagram (text description)
  2. Electrical requirements (220V compatible)
  3. Workflow optimization tips
  4. Safety considerations for Egyptian conditions
  5. Dust/sand mitigation strategies`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Gemini API error:', error);
    return 'Unable to generate workshop layout at this time.';
  }
};

export const identifyPartFromImage = async (imageBase64: string) => {
  if (!genAI) {
    return 'AI service not configured. Please contact support.';
  }
  
  const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
  
  const prompt = `${EGYPTIAN_MARKET_CONTEXT}
  
  Identify this industrial machine part from the image for an Egyptian workshop.
  
  Return:
  1. Official YILMAZ part name and number
  2. Compatible machine models
  3. Common Egyptian terms for this part
  4. Local supplier options in Egypt
  5. Price range in EGP`;

  try {
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } }
    ]);
    return result.response.text();
  } catch (error) {
    console.error('Gemini Vision API error:', error);
    return 'Unable to identify part from image at this time.';
  }
};
