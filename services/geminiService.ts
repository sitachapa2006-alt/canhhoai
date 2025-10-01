import { GoogleGenAI, Modality } from "@google/genai";
import type { GenerationParams, OptionState } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
    return {
        inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
};

const generateSingleImage = async (prompt: string, imageParts: any[], customImageParts: any[]): Promise<string> => {
     const contents = {
        parts: [
            ...imageParts,
            ...customImageParts,
            { text: prompt }
        ],
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: contents,
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return part.inlineData.data;
        }
    }

    throw new Error("AI không trả về hình ảnh cho một trong các yêu cầu. Vui lòng thử tinh chỉnh lại yêu cầu của bạn.");
};

export const generateCompositeImage = async (params: GenerationParams): Promise<string[]> => {
    const {
        characterImages,
        clothing,
        background,
        vehicle,
        celebrity,
        weather,
        additionalRequest,
        adjustSkinTone,
        applyMakeup,
        onProgress,
    } = params;

    let basePrompt = `The absolute highest priority is to perfectly preserve the face and identity of the person/people in the uploaded image(s). You MUST NOT alter their facial features, expression (unless requested), age, or ethnicity. The person in the final image must be instantly recognizable as the same person from the source photo. This is a non-negotiable instruction.
With that primary instruction in mind, create a professional, realistic, high-resolution, and seamlessly blended composite photograph.
The main subjects are the people from the provided image(s). Place them in the scene naturally.
`;

    if (adjustSkinTone) {
        basePrompt += `Subtly even out any uneven skin tone on the subjects for a smooth, natural look. Avoid making it look airbrushed or fake. `;
    }
    if (applyMakeup) {
        basePrompt += `If any of the subjects are female, apply light, natural-looking makeup (foundation, subtle eyeliner, mascara, neutral lipstick) that enhances their features without being overly dramatic. `;
    }


    const addOptionToPrompt = (option: OptionState, name: string, description: string) => {
        if (option.enabled) {
            if (option.customFiles && option.customFiles.length > 0) {
                basePrompt += `For the ${name}, use the provided custom image(s) as a reference. `;
            } else if (option.value) {
                basePrompt += `${description}: ${option.value}. `;
            }
    
            if (option.customRequest) {
                basePrompt += `Specific request for the ${name}: "${option.customRequest}". `;
            }
        }
    };

    addOptionToPrompt(clothing, 'clothing', 'Subjects should be dressed in');
    addOptionToPrompt(background, 'background', 'The background should be a');
    addOptionToPrompt(vehicle, 'vehicle', 'Include a');
    addOptionToPrompt(celebrity, 'celebrity', 'Add a');
    addOptionToPrompt(weather, 'weather', 'The weather and atmosphere should be');
    
    if (additionalRequest) {
        basePrompt += `Overall additional user request: "${additionalRequest}". `;
    }

    basePrompt += `Ensure the final image is photorealistic and all elements are blended perfectly with correct lighting, shadows, and perspective.`;

    const mainImageParts = await Promise.all(characterImages.map(fileToGenerativePart));
    
    const allCustomFiles = [
        ...(clothing.enabled && clothing.customFiles ? clothing.customFiles.map(f => f.file) : []),
        ...(background.enabled && background.customFiles ? background.customFiles.map(f => f.file) : []),
        ...(vehicle.enabled && vehicle.customFiles ? vehicle.customFiles.map(f => f.file) : []),
        ...(celebrity.enabled && celebrity.customFiles ? celebrity.customFiles.map(f => f.file) : []),
    ];

    const customImageParts = await Promise.all(allCustomFiles.map(fileToGenerativePart));

    const angles = [
        "standard eye-level shot",
        "dynamic low-angle shot",
        "cinematic wide-angle shot",
        "intimate close-up shot"
    ];

    let completedCount = 0;
    const totalImages = angles.length;

    // Create an array of promises for image generation to run them in parallel
    const generationPromises = angles.map(angle => {
        const finalPrompt = `${basePrompt} The camera perspective should be a ${angle}.`;
        return generateSingleImage(finalPrompt, mainImageParts, customImageParts)
            .then(result => {
                // When a single image is successfully generated, update progress
                completedCount++;
                if (onProgress) {
                    onProgress(completedCount, totalImages);
                }
                return result;
            });
    });

    // Wait for all image generation promises to resolve
    const generatedImages = await Promise.all(generationPromises);
    
    return generatedImages;
};

export const removeImageBackground = async (base64Image: string): Promise<string> => {
    const prompt = "Your task is to perform professional-grade background removal. Identify the primary subject(s) in the image and isolate them perfectly. Remove the entire background, making it transparent. The output must be a PNG image with an alpha channel for transparency. Do not add any new elements, text, or watermarks. Only return the image of the isolated subject(s).";

    const imagePart = {
        inlineData: { data: base64Image, mimeType: 'image/png' },
    };

    const contents = {
        parts: [
            imagePart,
            { text: prompt }
        ],
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: contents,
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return part.inlineData.data;
        }
    }

    throw new Error("AI không trả về hình ảnh sau khi xóa nền.");
};
