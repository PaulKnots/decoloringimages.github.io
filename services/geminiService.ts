import { GoogleGenAI, Modality } from "@google/genai";

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const getPrompt = (thicknessDescription: string) => `You are an expert image processor. Your task is to convert a color clipart image into a printable, black-and-white coloring book page. Follow these steps precisely:
1. Analyze the input image to identify all distinct color regions and their boundaries.
2. Trace these boundaries to create clean, solid, and continuous black outlines. The outlines should be ${thicknessDescription} to make them suitable for coloring.
3. Remove all original fill colors from within these outlines.
4. Convert all enclosed areas to pure white.
The final output must be a high-resolution, black-and-white line art image containing only pure black outlines on a pure white background. There should be no grayscale artifacts, shading, or residual colors.`;


export const convertToColoringPage = async (base64ImageData: string, mimeType: string, lineThickness: number): Promise<string | null> => {
  const thicknessMap: { [key: number]: string } = {
    1: 'very thin',
    2: 'thin',
    3: 'medium',
    4: 'thick',
    5: 'very thick',
  };
  const thicknessDescription = thicknessMap[lineThickness] || 'medium';
  const prompt = getPrompt(thicknessDescription);
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64ImageData,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Gemini API request failed: ${error.message}`);
    }
    throw new Error("An unknown error occurred during the Gemini API request.");
  }
};