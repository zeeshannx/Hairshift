import { GoogleGenAI, Type } from "@google/genai";
import { FaceAnalysis, ViewAngle } from "../types";

// Default instance for standard calls
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = 'gemini-2.5-flash-image';
const ANALYSIS_MODEL = 'gemini-2.5-flash';
const VIDEO_MODEL = 'veo-3.1-fast-generate-preview';

interface GenerateOptions {
  sourceImage: string;
  prompt: string;
  maskImage?: string | null;
  referenceImage?: string | null;
}

// Helper for exponential backoff to handle 429 errors
const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  retries: number = 3,
  initialDelay: number = 2000
): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const code = error.status || error.code;
      const msg = error.message || '';
      // Retry on 429 (Too Many Requests / Quota) or 503 (Service Unavailable)
      const shouldRetry = code === 429 || code === 503 || msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED');
      
      if (!shouldRetry) throw error;
      
      const delay = initialDelay * Math.pow(2, i) + Math.random() * 500;
      console.warn(`Gemini API busy (${code}). Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
};

// Helper to process base64 strings
const processBase64 = (b64: string) => {
  const match = b64.match(/^data:(.+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image data format");
  return { mimeType: match[1], data: match[2] };
};

/**
 * Sends an image, optional mask, optional reference, and prompt to Gemini.
 */
export const generateEditedImage = async ({
  sourceImage,
  prompt,
  maskImage,
  referenceImage
}: GenerateOptions): Promise<string> => {
  try {
    const parts: any[] = [];

    // 1. Add Source Image
    const source = processBase64(sourceImage);
    parts.push({
      inlineData: {
        mimeType: source.mimeType,
        data: source.data,
      },
    });

    let finalInstruction = "";

    // 2. Add Mask Image (if present)
    if (maskImage) {
      const mask = processBase64(maskImage);
      parts.push({
        inlineData: {
          mimeType: mask.mimeType,
          data: mask.data,
        },
      });
      
      finalInstruction = `
      Context: The first image is the source portrait. The second image is a mask where white indicates the hair region.
      Task: Edit the source image by changing the hair in the masked area.
      Style Instruction: "${prompt}"
      Constraints: 
      - Strictly preserve the face, facial features (eyes, nose, mouth), skin tone, and background of the source image. 
      - Only modify the hair.
      - Ensure the new hair blends realistically with the original head shape and lighting.
      Output: Generate the resulting image.
      `;
    } else {
      // Auto-detection logic (No mask provided)
      finalInstruction = `
      Context: The provided image is a portrait.
      Task: Automatically detect and segment the person's hair, then replace it.
      Style Instruction: "${prompt}"
      Constraints:
      - CRITICAL: Do not change the person's face, identity, or expression. 
      - Keep the background exactly the same.
      - Adjust the new hairstyle to fit the person's head shape naturally.
      - The result must be photorealistic.
      Output: Generate the resulting image.
      `;
    }

    // 3. Add Reference Image (if present)
    if (referenceImage) {
      const ref = processBase64(referenceImage);
      parts.push({
        inlineData: {
          mimeType: ref.mimeType,
          data: ref.data,
        },
      });
      const refIndex = maskImage ? "third" : "second";
      finalInstruction += `\nReference: Use the hairstyle in the ${refIndex} image as a strict visual guide for texture, color, and cut. Transfer this style to the source person.`;
    }

    // 4. Add Text Prompt
    parts.push({ text: finalInstruction });

    console.log("Sending request with parts count:", parts.length);

    const response = await retryWithBackoff(() => ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts,
      },
    }));

    // Iterate through parts to find the image
    const responseParts = response.candidates?.[0]?.content?.parts;
    if (!responseParts) {
      throw new Error("No content generated");
    }

    let textOutput = "";
    for (const part of responseParts) {
      if (part.inlineData && part.inlineData.data) {
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
      if (part.text) {
        textOutput += part.text;
      }
    }

    if (textOutput) {
      console.warn("Model returned text instead of image:", textOutput);
      throw new Error(`Model returned text: ${textOutput.substring(0, 100)}...`);
    }

    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

/**
 * Generates a black and white mask where hair is white and everything else is black.
 */
export const generateHairMask = async (sourceImage: string): Promise<string> => {
  try {
    const { mimeType, data } = processBase64(sourceImage);
    
    const response = await retryWithBackoff(() => ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data
            }
          },
          {
            text: "Generate a high-contrast black and white segmentation mask of the hair in this image. The hair area must be pure white (#FFFFFF) and the background, face, and clothes must be pure black (#000000). The mask must match the composition and framing of the original image exactly."
          }
        ]
      }
    }));

    const responseParts = response.candidates?.[0]?.content?.parts;
    if (responseParts) {
      for (const part of responseParts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("Failed to generate mask");
  } catch (error) {
    console.error("Mask Generation Error:", error);
    throw error;
  }
};

/**
 * Generates a new view (Left, Right, Back) based on the original source and the generated hairstyle.
 */
export const generateAngleView = async (
  originalImage: string,
  generatedFrontImage: string,
  prompt: string,
  angle: ViewAngle
): Promise<string> => {
  try {
    const parts: any[] = [];
    
    // 1. Original Face (Identity Reference)
    const source = processBase64(originalImage);
    parts.push({
      inlineData: { mimeType: source.mimeType, data: source.data }
    });

    // 2. Generated Front (Hairstyle Reference)
    const hairRef = processBase64(generatedFrontImage);
    parts.push({
      inlineData: { mimeType: hairRef.mimeType, data: hairRef.data }
    });

    // 3. Prompt
    const angleDescription = angle === 'Left' ? 'left profile' 
      : angle === 'Right' ? 'right profile' 
      : 'view from behind (back of head)';

    const instruction = `
    Context: 
    - Image 1 is the reference for the person's identity (face, skin tone, clothes).
    - Image 2 is the reference for the NEW hairstyle that has been applied to them.

    Task:
    Generate a photorealistic image of this same person, but viewed from the ${angleDescription}.
    
    Requirements:
    - Identity: Must look like the same person as Image 1 (consistent clothes, skin).
    - Hair: Must look like the SAME hairstyle as Image 2, but viewed from the ${angleDescription}. 
      - Visualize how this specific cut (length, texture, volume) looks from the side/back.
    - Style: Photorealistic, studio lighting.
    - Hairstyle Description: ${prompt}.
    Output: Generate the resulting image.
    `;

    parts.push({ text: instruction });

    const response = await retryWithBackoff(() => ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts },
    }));

    const responseParts = response.candidates?.[0]?.content?.parts;
    if (!responseParts) throw new Error("No content generated");

    let textOutput = "";
    for (const part of responseParts) {
      if (part.inlineData && part.inlineData.data) {
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
      if (part.text) {
        textOutput += part.text;
      }
    }

    if (textOutput) {
      console.warn("Model returned text instead of image:", textOutput);
      throw new Error(`Model returned text: ${textOutput.substring(0, 100)}...`);
    }

    throw new Error("No image data found");

  } catch (error) {
    console.error(`Gemini View Generation Error (${angle}):`, error);
    throw error;
  }
};

/**
 * Generates a video using Veo (Physics Simulation or 3D view).
 */
export const generateStyleVideo = async (
  image: string,
  prompt: string,
  mode: '3D' | 'Physics' = 'Physics'
): Promise<string> => {
  
  const performGeneration = async (forceKeySelect: boolean = false) => {
    // Check for paid API Key selection (required for Veo)
    if ((window as any).aistudio) {
      const aistudio = (window as any).aistudio;
      if (forceKeySelect || !await aistudio.hasSelectedApiKey()) {
        await aistudio.openSelectKey();
      }
    }

    // Create a fresh instance to ensure the selected key is used
    const videoAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const { mimeType, data } = processBase64(image);

    let videoPrompt = "";
    if (mode === '3D') {
      videoPrompt = `Cinematic video. A smooth camera rotation around the person to show the hairstyle from multiple angles (360 view). The person remains still. Photorealistic, high quality. Keep the face and hairstyle consistent with the input image. Hairstyle details: ${prompt}`;
    } else {
      // Physics Mode
      videoPrompt = `Cinematic portrait video. The person is looking at the camera and gently turning their head and smiling. The hairstyle reacts to the movement with realistic physics, bounce, and sway. A soft breeze blows through the hair. Photorealistic, high quality. Keep the face and hairstyle consistent with the input image. Hairstyle details: ${prompt}`;
    }

    console.log(`Starting video generation (${mode})...`);

    let operation = await retryWithBackoff(() => videoAi.models.generateVideos({
      model: VIDEO_MODEL,
      prompt: videoPrompt,
      image: {
        imageBytes: data,
        mimeType: mimeType,
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '9:16'
      }
    }));

    // Poll for completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log("Polling video status...");
      operation = await retryWithBackoff(() => videoAi.operations.getVideosOperation({ operation: operation }));
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("No video generated");

    // Fetch the actual video bytes using the key
    const response = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  };

  try {
    return await performGeneration(false);
  } catch (error: any) {
    const errString = JSON.stringify(error) + (error.message || '');
    if (errString.includes("Requested entity was not found")) {
      console.warn("Veo entity not found (likely API Key issue). Prompting for re-selection.");
      return await performGeneration(true);
    }
    console.error("Veo Video Generation Error:", error);
    throw error;
  }
};

/**
 * Analyzes the face shape and features to suggest hairstyles.
 */
export const analyzeFace = async (sourceImage: string): Promise<FaceAnalysis | null> => {
  try {
    const match = sourceImage.match(/^data:(.+);base64,(.+)$/);
    if (!match) throw new Error("Invalid image data");
    
    const response = await retryWithBackoff(() => ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: match[1],
              data: match[2]
            }
          },
          {
            text: `Analyze the face in this image to provide highly personalized hairstyle recommendations.
            1. Accurately identify the face shape (e.g. Oval, Round, Square, Heart, Diamond, Oblong).
            2. Describe key facial features relevant to styling (e.g. forehead height, jawline strength, neck length).
            3. Suggest 3 distinct, trendy, and flattering hairstyles specifically tailored to this face shape.
               - Variety Requirement: Include one Short/Medium style, one Long style, and one Creative/Bold style.
            
            Return the result in JSON format.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            faceShape: { type: Type.STRING, description: "The identified face shape" },
            features: { type: Type.STRING, description: "Brief description of key facial features" },
            suggestions: {
              type: Type.ARRAY,
              description: "List of 3 suggested hairstyles",
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "A catchy name for the hairstyle (e.g. 'Textured French Bob')" },
                  description: { type: Type.STRING, description: "A complete, actionable image generation prompt starting with 'Change the hairstyle to...'. Include details on texture, volume, color, and how it frames the face. Mention 'Keep the face identical'." }
                }
              }
            }
          }
        }
      }
    }));

    const text = response.text;
    if (text) {
      return JSON.parse(text) as FaceAnalysis;
    }
    return null;
  } catch (error) {
    console.error("Face Analysis Error:", error);
    return null; // Fail silently or handle as needed
  }
};

/**
 * Gets hairstyle prompt suggestions based on user input.
 */
export const getHairstyleSuggestions = async (partialPrompt: string): Promise<string[]> => {
  if (!partialPrompt || partialPrompt.length < 3) return [];

  try {
    const response = await retryWithBackoff(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `The user is using an AI hairstyle editor and typing a prompt: "${partialPrompt}".
      Provide 4 short, distinct, and visually descriptive hairstyle phrases that could complete or enhance this thought.
      Focus on specific cuts, colors, and textures (e.g. "Long wavy platinum blonde", "Short textured pixie cut").
      Return ONLY a JSON array of strings.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    }));

    const text = response.text;
    if (text) {
      return JSON.parse(text);
    }
    return [];
  } catch (error) {
    console.error("Suggestion Error:", error);
    return [];
  }
};

/**
 * Gets currently trending hairstyles.
 */
export const getTrendingHairstyles = async (): Promise<string[]> => {
  try {
    const response = await retryWithBackoff(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Identify 5 currently trending hairstyles that are popular globally right now (from social media, fashion, etc). 
      Provide them as short, creative, and visually descriptive prompt phrases suitable for an AI image editor.
      Examples: "Textured wolf cut with blonde money pieces", "Sleek liquid bob with glass hair finish".
      Return ONLY a JSON array of strings.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    }));

    const text = response.text;
    if (text) {
      return JSON.parse(text);
    }
    return [];
  } catch (error) {
    console.error("Trending Error:", error);
    return ["Soft Butterfly Layers", "90s Supermodel Blowout", "Choppy Shaggy Mullet", "Platinum White Pixie", "Sleek High Braided Pony"];
  }
};