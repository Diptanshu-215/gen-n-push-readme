import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import axios from "axios";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Exclude irrelevant or binary files to save context window
const EXCLUDED_EXTS = [
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".pdf", ".zip", ".tar", ".gz",
  ".mp4", ".mov", ".lock", ".env", ".ttf", ".woff", ".woff2", ".eot"
];
const EXCLUDED_DIRS = [
  "node_modules", "dist", "build", ".next", ".git", ".github", "venv", "__pycache__"
];

function isRelevantFile(path: string) {
  if (EXCLUDED_DIRS.some((dir) => path.includes(`/${dir}/`) || path.startsWith(`${dir}/`))) return false;
  if (EXCLUDED_EXTS.some((ext) => path.endsWith(ext))) return false;
  if (path.includes("package-lock.json") || path.includes("yarn.lock") || path.includes("pnpm-lock.yaml")) return false;
  return true;
}

export async function POST(req: Request) {
  try {
    const { repoUrl } = await req.json();

    if (!repoUrl) {
      return NextResponse.json({ error: "Repository URL is required" }, { status: 400 });
    }

    // Extract owner and repo from URL
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      return NextResponse.json({ error: "Invalid GitHub repository URL" }, { status: 400 });
    }

    const [, owner, repo] = match;
    const repoName = repo.replace(/\.git$/, "");

    // 1. Get default branch
    const repoInfoRes = await axios.get(`https://api.github.com/repos/${owner}/${repoName}`);
    const defaultBranch = repoInfoRes.data.default_branch;

    // 2. Get repository tree
    const treeRes = await axios.get(`https://api.github.com/repos/${owner}/${repoName}/git/trees/${defaultBranch}?recursive=1`);
    const tree = treeRes.data.tree;

    const allFiles = tree.filter((t: any) => t.type === "blob").map((t: any) => t.path);
    const relevantFiles = allFiles.filter(isRelevantFile);

    // 3. Prioritize files to read content
    // We want entry points, configs, and main components
    const priorityKeywords = ["package.json", "tsconfig.json", "next.config.js", "setup.py", "requirements.txt", "main", "index", "App", "app/page", "src/"];
    
    // Sort so files matching priority keywords come first
    relevantFiles.sort((a: string, b: string) => {
      const aScore = priorityKeywords.find(k => a.includes(k)) ? 1 : 0;
      const bScore = priorityKeywords.find(k => b.includes(k)) ? 1 : 0;
      return bScore - aScore;
    });

    // Take top 15 files to avoid massive payloads (this can be adjusted)
    const filesToFetch = relevantFiles.slice(0, 15);
    let codeContext = "";

    await Promise.all(
      filesToFetch.map(async (path: string) => {
        try {
          const rawUrl = `https://raw.githubusercontent.com/${owner}/${repoName}/${defaultBranch}/${path}`;
          const res = await axios.get(rawUrl);
          // Only append if it's text and not huge
          if (typeof res.data === "string" || typeof res.data === "object") {
             const content = typeof res.data === "object" ? JSON.stringify(res.data) : res.data;
             if (content.length < 50000) { 
               codeContext += `\n--- FILE: ${path} ---\n\`\`\`\n${content}\n\`\`\`\n`;
             }
          }
        } catch (e) {
          console.error(`Failed to fetch ${path}`, e);
        }
      })
    );

    const fileTreeString = relevantFiles.slice(0, 200).join("\n"); // Limit tree display

    // 4. Send to Gemini
    const prompt = `You are an expert developer and technical writer building a README generator.
Task: Write a world-class, comprehensive, and engaging README.md for the GitHub repository: ${owner}/${repoName}.

Here is the repository file structure (top 200 files):
${fileTreeString}

Here is the content of the most crucial files to understand the project:
${codeContext}

Please generate the final README.md. 
Make sure it follows modern best practices. Do not wrap the whole response in a single markdown code block; just output the raw markdown text directly (you can use code blocks inside it of course). 
Add sections like:
- An engaging Title and short description
- Badges (use generic shields.io badges if appropriate)
- Features
- Tech Stack
- Getting Started (installation and running)
- Project Structure
- Contributing
- License

Be detailed and accurate based strictly on the provided code contents. Make it look beautiful!`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return NextResponse.json({ readme: response.text });
  } catch (error: any) {
    console.error("API Error:", error.response?.data || error.message);
    return NextResponse.json({ error: "Failed to generate README. Plase check your repository URL and ensure it's public. If using Gemini, check API key." }, { status: 500 });
  }
}
