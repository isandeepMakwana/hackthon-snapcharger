import { GoogleGenAI, Type } from "@google/genai";
import { GeminiAnalysisResult } from "../types";

// Helper to convert File to Base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Analyzes a charger image to extract technical specifications.
 * Uses Gemini 2.5 Flash Image model.
 */
export const analyzeChargerImage = async (file: File): Promise<GeminiAnalysisResult> => {
  try {
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      console.warn("No API_KEY found. Using mock simulation.");
      return simulateAnalysis();
    }

    const ai = new GoogleGenAI({ apiKey });
    const base64Data = await fileToGenerativePart(file);

    // Schema for structured JSON output
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        connectorType: { type: Type.STRING, description: "Type of EV connector (e.g., Type 2, CCS2)" },
        powerOutput: { type: Type.STRING, description: "Estimated power output (e.g., 7.2kW)" },
        suggestedTitle: { type: Type.STRING, description: "A catchy marketing title for this listing" },
        suggestedDescription: { type: Type.STRING, description: "A short, appealing description for an Airbnb-style listing" },
        confidence: { type: Type.NUMBER, description: "Confidence score between 0 and 1" },
      },
      required: ["connectorType", "powerOutput", "suggestedTitle", "suggestedDescription", "confidence"],
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Optimized for image tasks
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: file.type,
              data: base64Data
            }
          },
          {
            text: "Analyze this EV charger. Identify the connector type and estimate power output. Generate a catchy title and description for a peer-to-peer rental listing in India."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.4, // Low temperature for factual accuracy on specs
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Empty response from AI");
    
    return JSON.parse(jsonText) as GeminiAnalysisResult;

  } catch (error) {
    console.error("Gemini API Error:", error);
    // Fallback to simulation if API fails (graceful degradation for hackathon demo)
    return simulateAnalysis();
  }
};

const simulateAnalysis = (): Promise<GeminiAnalysisResult> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        connectorType: "Type 2 (AC)",
        powerOutput: "7.2kW",
        suggestedTitle: "Smart Wallbox @ Indiranagar",
        suggestedDescription: "High-speed home charger in a secure, covered location. Perfect for overnight charging. 24/7 CCTV surveillance.",
        confidence: 0.95
      });
    }, 2500); // 2.5s delay to simulate network/processing
  });
};