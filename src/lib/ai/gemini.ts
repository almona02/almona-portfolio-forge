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
- Popular brands: YILMAZ, Kaban
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

export const getTechnicalSupport = async (
  issue: string, 
  machineModel?: string, 
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  chatHistory?: string[]
) => {
  if (!genAI) {
    return 'AI service not configured. Please contact support.';
  }

  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const severityContext = {
    critical: `🚨 CRITICAL EMERGENCY - Machine safety issue requiring immediate action!
    - Prioritize safety protocols
    - Provide emergency shutdown procedures
    - When to call emergency technician: +20 xxx xxx xxxx`,
    high: `⚠️ HIGH PRIORITY - Significant operational issue
    - Provide detailed troubleshooting steps
    - Include safety checks
    - Estimated resolution time`,
    medium: `🔧 MEDIUM PRIORITY - Standard technical issue
    - Step-by-step diagnosis
    - Preventive recommendations
    - Normal support response`,
    low: `ℹ️ LOW PRIORITY - General inquiry or maintenance
    - Educational information
    - Best practices
    - Preventive guidance`
  };

  let prompt = `${EGYPTIAN_MARKET_CONTEXT}
  
  ${severityContext[severity]}
  
  MACHINE MODEL: ${machineModel || 'General YILMAZ equipment'}
  
  CUSTOMER ISSUE: ${issue}`;

  if (chatHistory && chatHistory.length > 0) {
    prompt += `\n\nCONVERSATION HISTORY:\n${chatHistory.slice(-6).join('\n')}`;
  }

  prompt += `\n\nProvide comprehensive technical support response in Arabic and English:

  1. **فحص السلامة الفوري / Immediate Safety Check** (if applicable)
  2. **تشخيص المشكلة / Problem Diagnosis**
  3. **خطوات استكشاف الأخطاء / Troubleshooting Steps**
  4. **قطع الغيار المطلوبة / Required Parts** (if applicable)
  5. **متى تطلب فني طوارئ / When to Call Technician**
  6. **توصيات الصيانة / Maintenance Recommendations**
  
  Use both Arabic and English technical terms. Consider Egyptian workshop conditions.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Technical support AI error:', error);
    return `عذراً، حدث خطأ في النظام. 
    
للمساعدة الفورية:
- الدعم الفني: +20 xxx xxx xxxx
- البريد الإلكتروني: support@almona.com
- طوارئ 24/7: +20 xxx xxx xxxx

Sorry, system error occurred.
For immediate assistance:
- Technical Support: +20 xxx xxx xxxx
- Email: support@almona.com  
- 24/7 Emergency: +20 xxx xxx xxxx`;
  }
};

export const getDiagnosticGuidance = async (symptoms: string[], machineModel?: string) => {
  if (!genAI) {
    return 'AI service not configured. Please contact support.';
  }

  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `${EGYPTIAN_MARKET_CONTEXT}

  DIAGNOSTIC ANALYSIS REQUEST
  Machine Model: ${machineModel || 'YILMAZ Equipment'}
  Symptoms Reported: ${symptoms.join(', ')}

  Provide systematic diagnostic guidance:

  1. **الأسباب المحتملة / Possible Causes** (ranked by probability)
  2. **خطوات التشخيص / Diagnostic Steps** (systematic approach)
  3. **اختبارات مطلوبة / Required Tests**
  4. **علامات تحذيرية / Warning Signs** to watch for
  5. **التدخل الفوري / Immediate Action** required (if any)
  6. **التشخيص المحتمل / Likely Diagnosis** with confidence level

  Consider Egyptian workshop conditions and available tools.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Diagnostic guidance AI error:', error);
    return 'Unable to provide diagnostic guidance at this time.';
  }
};

export const getMaintenanceAdvice = async (
  machineModel: string, 
  operatingHours: number, 
  lastMaintenanceDate?: string,
  workingConditions?: string
) => {
  if (!genAI) {
    return 'AI service not configured. Please contact support.';
  }

  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `${EGYPTIAN_MARKET_CONTEXT}

  MAINTENANCE CONSULTATION
  Machine: ${machineModel}
  Operating Hours: ${operatingHours}
  Last Maintenance: ${lastMaintenanceDate || 'Unknown'}
  Working Conditions: ${workingConditions || 'Standard Egyptian workshop'}

  Provide comprehensive maintenance guidance:

  1. **حالة الآلة الحالية / Current Machine Status**
  2. **الصيانة المطلوبة فوراً / Immediate Maintenance Needs**
  3. **جدول الصيانة الدورية / Preventive Maintenance Schedule**
  4. **قطع الغيار المطلوبة / Required Spare Parts**
  5. **تحسينات الأداء / Performance Improvements**
  6. **التكلفة المتوقعة / Expected Costs** in EGP
  7. **مخاطر التأجيل / Risks of Delaying Maintenance**

  Adapt recommendations for Egyptian climate and dust conditions.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Maintenance advice AI error:', error);
    return 'Unable to provide maintenance advice at this time.';
  }
};
