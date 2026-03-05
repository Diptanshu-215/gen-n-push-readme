"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileCode2, Sparkles, Loader2, Github, Copy, CheckCircle2, Edit2, Check, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSession, signIn } from "next-auth/react";

export default function Home() {
  const { data: session } = useSession();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  const [readme, setReadme] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pushSuccess, setPushSuccess] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [chatInput, setChatInput] = useState("");

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    setError(null);
    setReadme(null);
    setCopied(false);
    setPushSuccess(false);
    setIsEditing(false);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: url }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate README");
      }
      setReadme(data.readme);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !readme) return;

    setChatLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentReadme: readme, prompt: chatInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to modify README");
      }
      setReadme(data.readme);
      setChatInput("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setChatLoading(false);
    }
  };

  const handlePush = async () => {
    if (!readme || !url) return;
    setPushing(true);
    setError(null);
    setPushSuccess(false);

    try {
      const res = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: url, content: readme }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to push to GitHub");
      }
      setPushSuccess(true);
      setTimeout(() => setPushSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPushing(false);
    }
  };

  const copyToClipboard = () => {
    if (readme) {
      navigator.clipboard.writeText(readme);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen p-8 flex flex-col items-center justify-center relative bg-[#050505] selection:bg-purple-500/30">
      {/* Background glowing orbs */}
      <div className="fixed top-[10%] left-[10%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-purple-600 rounded-full blur-[140px] opacity-20 animate-pulse pointer-events-none"></div>
      <div className="fixed bottom-[10%] right-[10%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-blue-600 rounded-full blur-[140px] opacity-20 animate-pulse delay-1000 pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="z-10 w-full max-w-4xl flex flex-col items-center"
      >
        {!readme ? (
          <>
            <div className="flex items-center gap-3 mb-4 mt-20">
              <div className="p-3 bg-purple-500/20 rounded-xl border border-purple-500/30">
                <FileCode2 className="w-8 h-8 text-purple-400" />
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white glow-text">
                Readme AI
              </h1>
            </div>
            <p className="text-gray-400 text-lg md:text-xl mb-12 text-center max-w-2xl leading-relaxed">
              Instantly generate beautiful, comprehensive, and accurate README files for any public GitHub repository using Google Gemini.
            </p>
          </>
        ) : (
          <div className="flex items-center gap-3 w-full mb-6">
            <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
              <FileCode2 className="w-5 h-5 text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white glow-text">
              Readme AI
            </h1>
          </div>
        )}

        <form onSubmit={handleGenerate} className="w-full max-w-3xl relative group shadow-2xl z-20">
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 focus-within:from-purple-500 to-blue-600 focus-within:to-blue-500 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
          <div className="relative glass rounded-2xl p-2 flex flex-col sm:flex-row items-center gap-2">
            <div className="flex-1 flex items-center px-4 w-full">
              <Github className="w-5 h-5 text-gray-400 mr-3" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
                required
                className="w-full bg-transparent border-none text-white placeholder-gray-500 outline-none py-3 text-lg"
              />
            </div>
            <button
              type="submit"
              disabled={loading || pushing || chatLoading}
              className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium px-8 py-3 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate
                </>
              )}
            </button>
          </div>
        </form>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 p-4 glass border border-red-500/30 rounded-xl text-red-300 w-full max-w-3xl text-center shadow-lg shadow-red-900/10"
          >
            {error}
          </motion.div>
        )}

        <AnimatePresence>
          {readme && (
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="mt-8 w-full glass rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col"
            >
              {/* Toolbar */}
              <div className="bg-black/40 border-b border-white/5 px-6 py-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sticky top-0 z-10 backdrop-blur-md">
                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                  </div>
                  <span className="text-sm font-medium text-gray-300 font-mono bg-white/5 px-2 py-1 rounded">README.md</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className={`flex items-center gap-1.5 text-xs transition-colors px-3 py-1.5 rounded-lg border ${isEditing
                        ? "bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30"
                        : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"
                      }`}
                  >
                    {isEditing ? <Check className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
                    {isEditing ? "Done Editing" : "Edit Manually"}
                  </button>

                  <div className="w-px h-5 bg-white/10 mx-1"></div>

                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 transition-colors px-3 py-1.5 rounded-lg text-gray-300"
                  >
                    {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied!" : "Copy Raw"}
                  </button>

                  {session ? (
                    <button
                      onClick={handlePush}
                      disabled={pushing || pushSuccess || isEditing}
                      className="flex items-center gap-1.5 text-xs bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition-colors px-4 py-1.5 rounded-lg text-white font-medium shadow-lg shadow-purple-500/20"
                    >
                      {pushing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : pushSuccess ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : <Github className="w-3.5 h-3.5" />}
                      {pushing ? "Pushing..." : pushSuccess ? "Pushed!" : "Push to GitHub"}
                    </button>
                  ) : (
                    <button
                      onClick={() => signIn("github")}
                      className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 border border-white/10 transition-colors px-4 py-1.5 rounded-lg text-white font-medium"
                    >
                      <Github className="w-3.5 h-3.5" />
                      Login to Push
                    </button>
                  )}
                </div>
              </div>

              {/* Content Area */}
              <div className="relative flex-1">
                {isEditing ? (
                  <textarea
                    value={readme}
                    onChange={(e) => setReadme(e.target.value)}
                    className="w-full h-[500px] bg-[#0d0d0d] text-gray-300 p-8 resize-none outline-none font-mono text-sm leading-relaxed"
                    spellCheck="false"
                  />
                ) : (
                  <div className="p-8 max-h-[500px] overflow-y-auto markdown-body text-left w-full text-gray-200 bg-[#0a0a0a]">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {readme}
                    </ReactMarkdown>
                  </div>
                )}
              </div>

              {/* Chat Interface Bottom Bar */}
              <div className="bg-black/60 border-t border-white/5 p-4 backdrop-blur-md">
                <form onSubmit={handleChat} className="flex gap-3">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={chatLoading}
                    placeholder="Tell AI to modify the README (e.g. 'Add an installation section', 'Make it shorter')..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 focus:bg-white/10 transition-all placeholder-gray-500 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || !chatInput.trim()}
                    className="bg-purple-600 hover:bg-purple-500 text-white p-3 rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center min-w-[50px]"
                  >
                    {chatLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </form>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
