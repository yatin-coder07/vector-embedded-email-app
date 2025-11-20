"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Send, RefreshCw } from "lucide-react";

export default function AskQuestionPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ q: string; a: string }>>([]);
  const questionRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    // load recent history from sessionStorage to keep it lightweight
    try {
      const raw = sessionStorage.getItem("ask_history");
      if (raw) setHistory(JSON.parse(raw));
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem("ask_history", JSON.stringify(history.slice(0, 10)));
    } catch (e) {}
  }, [history]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);
    setAnswer(null);

    try {
      const response = await fetch("/api/ask-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const data = await response.json();

      if (response.ok) {
        setAnswer(data.answer ?? "(no answer returned)");
        // update history
        setHistory((h) => [{ q: question, a: data.answer ?? "(no answer)" }, ...h].slice(0, 10));
      } else {
        setErrorMessage(data.error || "Failed to get a response.");
      }
    } catch (error) {
      setErrorMessage("An unexpected error occurred.");
      console.error("Error submitting question:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sampleQuestions = [
    "Has Brandon paid his due for the website redesign project?",
    "What is the amount due on invoice INV-2025-14?",
    "When is the delivery expected for order #98231?",
    "Has Rohan received his refund?",
  ];

  const copyAnswer = async () => {
    if (!answer) return;
    try {
      await navigator.clipboard.writeText(answer);
      // tiny visual feedback
      const prev = document.getElementById("copy-btn");
      if (prev) {
        prev.animate([{ transform: "scale(1.0)" }, { transform: "scale(1.05)" }, { transform: "scale(1.0)" }], { duration: 220 });
      }
    } catch (e) {
      console.warn("copy failed", e);
    }
  };

  const tryAgain = async () => {
    if (!question.trim()) return;
    // simple re-run
    await handleSubmit(new Event("submit") as any);
  };

  return (
    <div className="min-h-screen flex items-start justify-center py-12 px-4 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-3xl">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <h1 className="flex-1 text-2xl md:text-3xl font-extrabold">Ask a Question</h1>
          <Link href="/send-emails" className="text-sm px-3 py-1 rounded-md border bg-white/80 dark:bg-black/40">Send Email</Link>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 border">
          <form onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-muted-foreground">Your question</label>
            <textarea
              ref={questionRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Has Brandon paid his due for the website redesign project?"
              className="mt-2 w-full min-h-[120px] resize-y rounded-lg border p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow shadow-sm bg-transparent"
            />

            <div className="mt-4 flex items-center gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-indigo-600 text-white font-semibold shadow hover:scale-105 transform transition"
              >
                {isLoading ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{isLoading ? "Thinking..." : "Submit"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setQuestion("");
                  setAnswer(null);
                  setErrorMessage(null);
                  questionRef.current?.focus();
                }}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-white/60 hover:bg-white/70 transition"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={() => {
                  // pick a random sample
                  const s = sampleQuestions[Math.floor(Math.random() * sampleQuestions.length)];
                  setQuestion(s);
                  questionRef.current?.focus();
                }}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-white/60 hover:bg-white/70 transition"
              >
                Try a sample
              </button>

              <div className="ml-auto text-sm text-muted-foreground">Tip: Ask specific questions (who/what/when/how much)</div>
            </div>
          </form>

          {/* Result Card */}
          <div className="mt-6">
            <div className="rounded-lg border bg-white/50 dark:bg-slate-800 p-4">
              {answer ? (
                <div>
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Answer</div>
                      <div className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{answer}</div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button id="copy-btn" onClick={copyAnswer} className="p-2 rounded-md border hover:bg-white/60" title="Copy answer">
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          // quick re-run
                          tryAgain();
                        }}
                        className="p-2 rounded-md border hover:bg-white/60"
                        title="Try again"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-muted-foreground">Source: latest matched emails</div>
                </div>
              ) : errorMessage ? (
                <div className="text-sm text-red-600">{errorMessage}</div>
              ) : (
                <div className="text-sm text-muted-foreground">No answer yet — ask something to get started.</div>
              )}
            </div>

            {/* small history */}
            {history.length > 0 && (
              <div className="mt-4">
                <div className="text-xs text-muted-foreground mb-2">Recent</div>
                <div className="space-y-2">
                  {history.map((h, idx) => (
                    <div key={idx} className="p-3 rounded-md border bg-white/60 dark:bg-slate-900 flex items-start justify-between">
                      <div className="text-sm">
                        <div className="font-semibold text-sm">Q: {h.q}</div>
                        <div className="mt-1 text-xs text-muted-foreground">A: {h.a}</div>
                      </div>
                      <div className="ml-4 flex flex-col gap-2">
                        <button
                          onClick={() => {
                            setQuestion(h.q);
                            setAnswer(h.a);
                            questionRef.current?.focus();
                          }}
                          className="p-2 rounded-md border"
                          title="Load question"
                        >
                          <ArrowLeft className="w-4 h-4 rotate-180" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground">Powered by Embeddings + Extractive QA + Smart fallbacks</div>
      </div>
    </div>
  );
}
