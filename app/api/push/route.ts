import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import axios from "axios";

export async function POST(req: Request) {
    try {
        const session: any = await getServerSession(authOptions);
        if (!session || !session.accessToken) {
            return NextResponse.json({ error: "Unauthorized. Please login with GitHub first." }, { status: 401 });
        }

        const { repoUrl, content } = await req.json();

        if (!repoUrl || !content) {
            return NextResponse.json({ error: "Repository URL and content are required" }, { status: 400 });
        }

        const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!match) {
            return NextResponse.json({ error: "Invalid GitHub repository URL" }, { status: 400 });
        }

        const [, owner, repo] = match;
        const repoName = repo.replace(/\.git$/, "");
        const headers = {
            Authorization: `Bearer ${session.accessToken}`,
            Accept: "application/vnd.github.v3+json",
        };

        // 1. Get default branch
        const repoInfoRes = await axios.get(`https://api.github.com/repos/${owner}/${repoName}`, { headers });
        const defaultBranch = repoInfoRes.data.default_branch;

        // 2. Check if README.md exists to get its SHA
        let fileSha = undefined;
        try {
            const fileRes = await axios.get(`https://api.github.com/repos/${owner}/${repoName}/contents/README.md?ref=${defaultBranch}`, { headers });
            fileSha = fileRes.data.sha;
        } catch (e: any) {
            if (e.response?.status !== 404) {
                throw e;
            }
        }

        // 3. Update or Create README.md
        await axios.put(
            `https://api.github.com/repos/${owner}/${repoName}/contents/README.md`,
            {
                message: "docs(readme): Update README.md via Readme Generator AI",
                content: Buffer.from(content).toString("base64"),
                sha: fileSha,
                branch: defaultBranch,
            },
            { headers }
        );

        return NextResponse.json({ success: true, message: "Pushed successfully!" });
    } catch (error: any) {
        console.error("Push Error:", error.response?.data || error.message);
        return NextResponse.json({ error: error.response?.data?.message || "Failed to push to GitHub" }, { status: 500 });
    }
}
