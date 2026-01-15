import type { GeminiAnalysisResult } from '@/types';

export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      if (!base64Data) {
        reject(new Error('Invalid image data'));
        return;
      }
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeChargerImage = async (file: File): Promise<GeminiAnalysisResult> => {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('No VITE_GEMINI_API_KEY found. Using mock simulation.');
      return simulateAnalysis();
    }

    const { GoogleGenAI, Type } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });
    const base64Data = await fileToGenerativePart(file);

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        connectorType: { type: Type.STRING, description: 'Type of EV connector (e.g., Type 2, CCS2)' },
        powerOutput: { type: Type.STRING, description: 'Estimated power output (e.g., 7.2kW)' },
        suggestedTitle: { type: Type.STRING, description: 'A catchy marketing title for this listing' },
        suggestedDescription: {
          type: Type.STRING,
          description: 'A short, appealing description for an Airbnb-style listing',
        },
        confidence: { type: Type.NUMBER, description: 'Confidence score between 0 and 1' },
      },
      required: ['connectorType', 'powerOutput', 'suggestedTitle', 'suggestedDescription', 'confidence'],
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: file.type,
              data: base64Data,
            },
          },
          {
            text: 'Analyze this EV charger. Identify the connector type and estimate power output. Generate a catchy title and description for a peer-to-peer rental listing in India.',
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0.4,
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error('Empty response from AI');

    return JSON.parse(jsonText) as GeminiAnalysisResult;
  } catch (error) {
    console.error('Gemini API Error:', error);
    return simulateAnalysis();
  }
};

const simulateAnalysis = (): Promise<GeminiAnalysisResult> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        connectorType: 'Type 2 (AC)',
        powerOutput: '7.2kW',
        suggestedTitle: 'Smart Wallbox @ Indiranagar',
        suggestedDescription:
          'High-speed home charger in a secure, covered location. Perfect for overnight charging. 24/7 CCTV surveillance.',
        confidence: 0.95,
      });
    }, 2500);
  });
};
