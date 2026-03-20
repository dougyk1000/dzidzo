import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { Language, Subject, ExamBoard, QuizQuestion, Resource, ProgressRecord } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const SYSTEM_INSTRUCTIONS = (language: Language, subject: Subject, board: ExamBoard = 'ZIMSEC', level: string = 'O-Level', style?: string) => `
You are Dzidzo, an expert ${board} tutor for ${level} students.
Your goal is to help students learn ${subject} step-by-step at a ${level} level.

EXAM BOARD: ${board}
STUDENT LEVEL: ${level}
LANGUAGE RULES:
- Current Language Mode: ${language}
${language === 'Shona' ? '- Explain in Shona but keep technical/mathematical terms in English.' : ''}
${language === 'Ndebele' ? '- Explain clearly in Ndebele with exam-style structure but keep technical terms in English.' : ''}
${language === 'English' ? '- Respond in structured ${board} exam format.' : ''}

${style ? `TUTOR STYLE: ${style}` : ''}

BEHAVIOR RULES:
1. Follow the ${board} ${level} syllabus strictly.
2. Show full step-by-step solutions for calculations.
3. Avoid skipping logical steps.
4. Be strict but encouraging in marking.
5. Use simple, clear explanations appropriate for ${level}.
6. If the student asks something outside of ${board} ${level} syllabus or education, politely redirect them back to their studies.

OUTPUT FORMAT:
1. Step-by-step solution
2. Final answer (bolded)
3. Short explanation/concept summary
`;

export async function getTutorResponse(
  message: string,
  language: Language,
  subject: Subject,
  board: ExamBoard = 'ZIMSEC',
  level: string = 'O-Level',
  history: { role: 'user' | 'model'; parts: { text: string }[] }[] = [],
  contextResources: Resource[] = [],
  style?: string
): Promise<string> {
  try {
    const model = "gemini-3-flash-preview";
    
    // Build context from resources
    const resourceContext = contextResources.length > 0 
      ? `\n\nRELEVANT RESOURCES FOR THIS SUBJECT:\n${contextResources.map(r => `- ${r.title}: ${r.description}`).join('\n')}`
      : "";

    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents: [
        ...history,
        { role: 'user', parts: [{ text: message + resourceContext }] }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTIONS(language, subject, board, level, style),
        temperature: 0.7,
      },
    });

    return response.text || "I'm sorry, I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Something went wrong. Please check your connection and try again.";
  }
}

export async function analyzeStudentProgress(
  progress: ProgressRecord[],
  subject: Subject,
  board: ExamBoard,
  level: string,
  language: Language
): Promise<string> {
  try {
    const model = "gemini-3-flash-preview";
    const dataSummary = progress.map(p => `- ${p.topic}: Score ${p.score}%, Weakness: ${p.weaknessLevel}`).join('\n');
    
    const prompt = `Analyze this student's progress in ${board} ${level} ${subject}:
    ${dataSummary}
    
    Provide a professional, encouraging analysis in ${language}. 
    Identify the top 3 priorities for improvement and suggest specific study techniques appropriate for ${level}.
    Format the output with clear headings and bullet points.`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: `You are a senior educational consultant for ${board} ${level}.`,
      }
    });

    return response.text || "Unable to analyze progress at this time.";
  } catch (error) {
    console.error("Progress Analysis Error:", error);
    return "Error analyzing progress.";
  }
}

export async function solvePastPaperQuestion(
  imageData: string, // base64
  language: Language,
  subject: Subject,
  board: ExamBoard = 'ZIMSEC',
  level: string = 'O-Level'
): Promise<string> {
  try {
    const model = "gemini-3-flash-preview";
    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents: [
        {
          parts: [
            { inlineData: { data: imageData, mimeType: "image/jpeg" } },
            { text: `Identify this ${board} ${level} ${subject} question and solve it step-by-step in ${language}. Provide the marking points as well.` }
          ]
        }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTIONS(language, subject, board, level),
      },
    });

    return response.text || "I couldn't read the image. Please upload a clearer photo.";
  } catch (error) {
    console.error("OCR Solver Error:", error);
    return "Error processing the image. Please try again.";
  }
}

export async function generateQuizQuestions(
  subject: Subject,
  board: ExamBoard,
  level: string,
  language: Language,
  count: number = 5
): Promise<QuizQuestion[]> {
  try {
    const model = "gemini-3-flash-preview";
    const response = await ai.models.generateContent({
      model,
      contents: `Generate ${count} multiple-choice questions for ${board} ${level} ${subject} in ${language}. 
      Each question must have 4 options, a correct answer index (0-3), and a brief explanation.
      Follow typical ${board} ${level} exam style and difficulty.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { 
                type: Type.ARRAY,
                items: { type: Type.STRING },
                minItems: 4,
                maxItems: 4
              },
              correctAnswer: { type: Type.INTEGER },
              explanation: { type: Type.STRING }
            },
            required: ["question", "options", "correctAnswer", "explanation"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Quiz Generation Error:", error);
    return [];
  }
}
