import { GoogleGenAI, GenerateContentResponse, Type, FunctionDeclaration } from "@google/genai";
import { Language, Subject, ExamBoard, QuizQuestion, Resource, ProgressRecord } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const SYSTEM_INSTRUCTIONS = (
  language: Language, 
  subjects: Subject[], 
  board: ExamBoard = 'ZIMSEC', 
  level: string = 'O-Level', 
  style?: string, 
  homeworkContext?: string, 
  chatbotName: string = 'Dzidzo', 
  studentName?: string,
  progress: ProgressRecord[] = []
) => `
You are ${chatbotName}, an expert ${board} tutor for ${level} students at Marchwood Senior School.
Your goal is to help students learn these subjects: ${subjects.join(', ')} step-by-step at a ${level} level.

STUDENT NAME: ${studentName || 'Student'}
EXAM BOARD: ${board}
STUDENT LEVEL: ${level}
SCHOOL: Marchwood Senior School

STUDENT PROGRESS & STATS:
${progress.length > 0 ? progress.map(p => `- Subject: ${p.subject}, Topic: ${p.topic}, Score: ${p.score}%, Level: ${p.weaknessLevel}, Last Attempt: ${p.lastAttempt}`).join('\n') : 'No progress recorded yet. Start fresh!'}

LANGUAGE RULES:
- Current Language Mode: ${language}
${language === 'Shona' ? '- Explain in Shona but keep technical/mathematical terms in English.' : ''}
${language === 'Ndebele' ? '- Explain clearly in Ndebele with exam-style structure but keep technical terms in English.' : ''}
${language === 'English' ? '- Respond in structured ${board} exam format.' : ''}

${style ? `TUTOR STYLE: ${style}` : ''}

PERSONALIZATION:
- Use ${studentName || 'the student'}'s name frequently.
- Refer to their "STUDENT PROGRESS" to identify weak topics. If a student is "high" weakness in a topic, spend more time explaining it.
- Congratulate them on "low" weakness topics.
- Adapt your wording to fit the student's communication style as defined in the TUTOR STYLE.
- Make the learning experience feel personal and supportive.

${homeworkContext ? `
CURRENT HOMEWORK CONTEXT:
${homeworkContext}

ANTI-CHEAT RULES:
1. If the student asks for the direct answer to any question found in the "ACTIVE" homework listed above, you MUST REFUSE to give the answer.
2. Instead, tell them: "I cannot give you the direct answer to this question as it is part of your current homework assignment at Marchwood Senior School."
3. You MAY provide hints, explain the underlying concepts, or give a similar example to help them solve it themselves.
4. If the homework is marked as "EXPIRED" (due date has passed), you are free to discuss it and provide full answers.
` : ''}

BEHAVIOR RULES:
1. Follow the ${board} ${level} syllabus strictly for all subjects.
2. Show full step-by-step solutions for calculations (unless it's active homework).
3. Avoid skipping logical steps.
4. Be strict but encouraging in marking.
5. Use simple, clear explanations appropriate for ${level}.
6. If the student asks something outside of ${board} ${level} syllabus or education, politely redirect them back to their studies.
7. Adapt your tone and complexity based on the student's previous messages. If they seem to struggle, simplify. If they are advanced, challenge them.

OUTPUT FORMAT:
1. Step-by-step solution
2. Final answer (bolded)
3. Short explanation/concept summary
4. ASSESSMENT TRIGGER: If the student asks for a "test", "quiz", "mock exam", or "assessment" on a topic you just discussed, you MUST call the "start_assessment" tool. Confirm to the student that you have prepared the test and that they can click the button below your message to begin.
5. DIAGRAM TRIGGER: If a visual explanation (diagram, chart, or scientific illustration) would help the student understand a concept (e.g., the structure of a cell, a circuit diagram, or a geometry sketch), you MUST call the "generate_diagram" tool.
`;

const startAssessmentTool: FunctionDeclaration = {
  name: "start_assessment",
  description: "Trigger a quiz or a full mock exam for the student based on the current discussion.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      type: {
        type: Type.STRING,
        enum: ["quiz", "exam"],
        description: "Whether to start a quick quiz (5 questions) or a full mock exam (10 questions)."
      },
      subject: {
        type: Type.STRING,
        description: "The subject to test the student on. Must be one of their enrolled subjects."
      },
      topic: {
        type: Type.STRING,
        description: "Optional specific topic to focus the questions on."
      }
    },
    required: ["type", "subject"]
  }
};

const generateDiagramTool: FunctionDeclaration = {
  name: "generate_diagram",
  description: "Generate a visual diagram, illustration, or scientific sketch to help the student visualize a concept.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: {
        type: Type.STRING,
        description: "A detailed description of the diagram needed. For example: 'A labeled diagram of a human heart showing all chambers and valves' or 'A circuit diagram with a battery, resistor, and switch'."
      },
      labelItems: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of parts or labels that should be explicitly included or emphasized in the diagram."
      }
    },
    required: ["prompt"]
  }
};

export interface TutorAIResponse {
  text: string;
  imageUrl?: string;
  toolCall?: {
    name: string;
    args: any;
  };
}

export async function getTutorResponse(
  message: string,
  language: Language,
  subjects: Subject[],
  board: ExamBoard = 'ZIMSEC',
  level: string = 'O-Level',
  history: any[] = [],
  contextResources: Resource[] = [],
  style?: string,
  homeworkList: any[] = [],
  chatbotName: string = 'Dzidzo',
  studentName?: string,
  progress: ProgressRecord[] = []
): Promise<TutorAIResponse> {
  try {
    const model = "gemini-3-flash-preview";
    
    // Build context from resources
    const resourceContext = contextResources.length > 0 
      ? `\n\nRELEVANT RESOURCES FOR YOUR SUBJECTS:\n${contextResources.map(r => `- ${r.subject} - ${r.title}: ${r.description}`).join('\n')}`
      : "";

    // Build homework context
    const now = new Date();
    const homeworkContext = homeworkList.length > 0
      ? homeworkList.map(h => {
          const dueDate = new Date(h.dueDate);
          const status = dueDate > now ? "ACTIVE" : "EXPIRED";
          return `[${status}] Subject: ${h.subject}\nTitle: ${h.title}\nContent: ${h.content || 'Image attached'}\nDue: ${h.dueDate}`;
        }).join('\n---\n')
      : "";

    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents: [
        ...history,
        { role: 'user', parts: [{ text: message + resourceContext }] }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTIONS(language, subjects, board, level, style, homeworkContext, chatbotName, studentName, progress),
        temperature: 0.7,
        tools: [{ functionDeclarations: [startAssessmentTool, generateDiagramTool] }]
      },
    });

    const toolCalls = response.functionCalls;
    if (toolCalls && toolCalls.length > 0) {
      const toolCall = toolCalls[0];
      
      if (toolCall.name === 'generate_diagram') {
        const toolArgs = toolCall.args as { prompt: string; labelItems?: string[] };
        const diagramUrl = await generateDiagram(toolArgs.prompt, toolArgs.labelItems);
        return {
          text: response.text || "Here is a diagram to help visualize the concept:",
          imageUrl: diagramUrl,
          toolCall: { name: toolCall.name, args: toolArgs }
        };
      }

      return {
        text: response.text || "Switching to your assessment now...",
        toolCall: {
          name: toolCall.name,
          args: toolCall.args
        }
      };
    }

    return {
      text: response.text || "I'm sorry, I couldn't generate a response. Please try again."
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      text: "Something went wrong. Please check your connection and try again."
    };
  }
}

export async function generateWeeklySummary(
  progress: ProgressRecord[],
  board: ExamBoard,
  level: string,
  language: Language,
  studentName: string,
  style?: string
): Promise<{ summary: string; rating: number; potential: string; weaknesses: string[] }> {
  try {
    const model = "gemini-3-flash-preview";
    const dataSummary = progress.map(p => `- Subject: ${p.subject}, Topic: ${p.topic}, Score: ${p.score}%, Type: ${p.type || 'study'}, Priority: ${p.weaknessLevel}`).join('\n');
    
    const prompt = `Analyze the weekly progress for ${studentName} (${board} ${level}):
    ${dataSummary}
    
    TUTOR STYLE: ${style || 'Professional and encouraging'}
    
    Provide a personalized weekly summary in ${language} addressed directly to ${studentName}.
    Use wording that fits the student's communication style (as per the TUTOR STYLE).
    Include:
    1. A general summary of the week's performance, using ${studentName}'s name.
    2. A list of specific areas where ${studentName} is lacking/weaknesses.
    3. An assessment of ${studentName}'s potential.
    4. A rating from 1 to 5 stars (as an integer).
    
    Format the response as JSON.`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            rating: { type: Type.INTEGER },
            potential: { type: Type.STRING },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["summary", "rating", "potential", "weaknesses"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Weekly Summary Error:", error);
    return {
      summary: "Unable to generate summary at this time.",
      rating: 0,
      potential: "Unknown",
      weaknesses: []
    };
  }
}

export async function analyzeStudentProgress(
  progress: ProgressRecord[],
  subjects: Subject[],
  board: ExamBoard,
  level: string,
  language: Language,
  studentName: string,
  style?: string
): Promise<string> {
  try {
    const model = "gemini-3-flash-preview";
    const dataSummary = progress.map(p => `- [${p.subject}] ${p.topic}: Score ${p.score}%, Type: ${p.type || 'study'}, Priority: ${p.weaknessLevel}`).join('\n');
    
    const prompt = `Analyze ${studentName}'s progress across their subjects (${subjects.join(', ')}) in ${board} ${level}:
    ${dataSummary || 'No recent study data available.'}
    
    TUTOR STYLE: ${style || 'Professional and encouraging'}
    
    Provide a holistic personalized analysis in ${language} addressed directly to ${studentName}. 
    Use the student's name frequently and adapt your wording to fit their communication style.
    Identify the top 3 priorities for improvement across all subjects and suggest specific study techniques appropriate for ${level}.
    Format the output with clear headings and bullet points in Markdown.`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: `You are a senior educational consultant for ${board} ${level}. You are speaking directly to ${studentName}.`,
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
  subjects: Subject[],
  board: ExamBoard = 'ZIMSEC',
  level: string = 'O-Level',
  history: any[] = [],
  studentName?: string
): Promise<string> {
  try {
    const model = "gemini-3-flash-preview";
    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents: [
        ...history,
        {
          role: 'user',
          parts: [
            { inlineData: { data: imageData, mimeType: "image/jpeg" } },
            { text: `Identify this ${board} ${level} question (from subjects: ${subjects.join(', ')}) and solve it step-by-step in ${language} for ${studentName || 'the student'}. Provide the marking points as well.` }
          ]
        }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTIONS(language, subjects, board, level, undefined, undefined, 'Dzidzo', studentName),
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
  history: any[] = [],
  topic?: string,
  count: number = 5
): Promise<QuizQuestion[]> {
  try {
    const model = "gemini-3-flash-preview";
    const topicPrompt = topic ? `\n\nFOCUS TOPIC: ${topic}` : "";
    const historyContext = history.length > 0
      ? `\n\nCONTEXT FROM PREVIOUS DISCUSSION:\n${history.map(m => `Role: ${m.role}\nContent: ${m.parts[0].text}`).join('\n---\n')}`
      : "";

    const prompt = `Generate ${count} multiple-choice questions for ${board} ${level} ${subject} in ${language}. 
      Each question must have 4 options, a correct answer index (0-3), and a brief explanation.
      If the question references a biological structure, physical diagram, chemical reaction apparatus, or geometric shape, you MUST include a "diagramPrompt" field with a detailed description for an image generator (e.g. "A labelled diagram of a mitosis cell cycle").
      Follow typical ${board} ${level} exam style and difficulty.${topicPrompt}${historyContext}`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
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
              explanation: { type: Type.STRING },
              diagramPrompt: { type: Type.STRING }
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

export async function generateDiagram(prompt: string, labels?: string[]): Promise<string> {
  try {
    const labelPrompt = labels && labels.length > 0 ? ` Please clearly label: ${labels.join(', ')}.` : '';
    const finalPrompt = `A pedagogical, high-quality, clear educational diagram or scientific illustration of: ${prompt}.${labelPrompt} Use a clean, educational style suitable for a school textbook.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts: [{ text: finalPrompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return '';
  } catch (error) {
    console.error("Image Generation Error:", error);
    return '';
  }
}

export async function generateMockExam(
  subject: Subject,
  board: ExamBoard,
  level: string,
  language: Language,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[] = [],
  topic?: string,
  count: number = 10
): Promise<QuizQuestion[]> {
  try {
    const model = "gemini-3-flash-preview";
    
    const contextPrompt = history.length > 0 
      ? `\n\nCONTEXT FROM PREVIOUS CHAT:\n${history.slice(-10).map(h => `${h.role}: ${h.parts[0].text}`).join('\n')}`
      : "";

    const topicPrompt = topic ? `\n\nFOCUS TOPIC: ${topic}` : "";

    const prompt = `Generate a comprehensive ${count}-question mock exam for ${board} ${level} ${subject} in ${language}. 
    ${topicPrompt}
    ${contextPrompt}
    
    The questions should be a mix of difficulty levels (easy, medium, hard) and follow the official ${board} ${level} exam style.
    Each question must have 4 options, a correct answer index (0-3), and a detailed explanation.
    If the question references a complex concept and would benefit from a visual aid (e.g. geography map, science apparatus, geometry sketch), include a "diagramPrompt" for an AI image generator.
    
    Return the result as a JSON array of objects with the following structure:
    [
      {
        "question": "string",
        "options": ["string", "string", "string", "string"],
        "correctAnswer": number,
        "explanation": "string",
        "diagramPrompt": "string (optional)"
      }
    ]`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
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
              explanation: { type: Type.STRING },
              diagramPrompt: { type: Type.STRING }
            },
            required: ["question", "options", "correctAnswer", "explanation"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Mock Exam Generation Error:", error);
    return [];
  }
}
