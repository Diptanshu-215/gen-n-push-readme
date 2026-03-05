import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
    try {
        const { currentReadme, prompt } = await req.json();

        if (!currentReadme || !prompt) {
            return NextResponse.json({ error: "README content and prompt are required" }, { status: 400 });
        }

        const aiPrompt = `You are an expert technical writer.
The user wants to modify their existing README.md file.

Here is their current README:
\`\`\`markdown
${currentReadme}
\`\`\`

User's instruction for modification: "${prompt}"

Task: Apply the user's modifications to the README.
Return ONLY the newly updated raw markdown content. Do not wrap it in a markdown block, do not include any introductory or concluding text, just output the exact new README text that will replace the old one.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: aiPrompt,
        });

        let newReadme = response.text;
        if (!newReadme) {
            throw new Error("Empty response from AI");
        }

        // Strip out markdown code block wrappers if the AI included them accidentally
        if (newReadme.startsWith("\`\`\`markdown\n")) {
            newReadme = newReadme.substring(12);
            if (newReadme.endsWith("\`\`\`")) {
                newReadme = newReadme.substring(0, newReadme.length - 3);
            }
        }

        return NextResponse.json({ readme: newReadme.trim() });
    } catch (error: any) {
        console.error("Chat API Error:", error.message);
        return NextResponse.json({ error: "Failed to modify README." }, { status: 500 });
    }
}
