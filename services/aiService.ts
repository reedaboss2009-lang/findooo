import { GoogleGenAI, Type } from "@google/genai";

// Helper to safely get environment variables without crashing in browser
const getEnvVar = (key: string): string => {
  // 1. Try Vite (import.meta.env)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[`VITE_${key}`]) {
      // @ts-ignore
      return import.meta.env[`VITE_${key}`];
    }
  } catch (e) {}

  // 2. Try Node/Webpack (process.env)
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] as string;
    }
  } catch (e) {}

  return "";
};

const apiKey = getEnvVar("API_KEY");

// Initialize Gemini Client safely
// If no key is present, we still initialize but calls might fail gracefully rather than crashing the app on load
const ai = new GoogleGenAI({ apiKey: apiKey || "dummy_key_to_prevent_crash_on_load" });

export const aiService = {
  /**
   * Fetches medicine name suggestions based on partial input using Gemini.
   */
  getMedicineSuggestions: async (query: string): Promise<string[]> => {
    if (!query || query.length < 2) return [];
    if (!apiKey || apiKey === "dummy_key_to_prevent_crash_on_load") {
        console.warn("Gemini API Key is missing. Search suggestions will not work.");
        return [];
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Suggest 5 common medicine names (brand names or molecules) available in Algerian pharmacies that start with or sound like "${query}". Only return the names.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING
            }
          }
        }
      });

      if (response.text) {
        return JSON.parse(response.text);
      }
      return [];
    } catch (error) {
      console.error("Error fetching suggestions from Gemini:", error);
      return [];
    }
  }
};