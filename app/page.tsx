import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";

import { ThemeSwitcher } from "@/components/theme-switcher";

import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";
import { HomeIcon, MailIcon, MessageCircle, Sparkles, Zap } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 transition-colors">
      <div className="flex-1 w-full flex flex-col gap-12 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16 bg-transparent">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="flex gap-4 items-center font-semibold text-lg">
              <Link href={"/"} className="flex items-center gap-2">
                <HomeIcon className="w-6 h-6" />
                <span className="hidden sm:inline">MailMind</span>
              </Link>
              <ThemeSwitcher />
            </div>
            <div className="flex items-center gap-4">
              {!hasEnvVars ? (
                <EnvVarWarning />
              ) : (
                <Suspense>
                  <AuthButton />
                </Suspense>
              )}
            </div>
          </div>
        </nav>

        {/* HERO */}
        <section className="w-full max-w-5xl px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
                Turn emails into instant answers — <span className="text-indigo-600">smartly</span>.
              </h1>
              <p className="mt-4 text-muted-foreground max-w-xl">
                MailMind uses embeddings + extractive QA to find the exact lines in your emails and answer user
                questions precisely. Test invoice checks, delivery statuses, refunds and more — with a single API.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/ask-question"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg hover:scale-105 transform transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  Ask a Question
                </Link>

                <Link
                  href="/send-emails"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-transparent bg-white/80 dark:bg-black/40 text-slate-900 dark:text-white shadow hover:shadow-lg hover:-translate-y-0.5 transform transition"
                >
                  <MailIcon className="w-4 h-4" />
                  Send an Email
                </Link>
              </div>

              <div className="mt-8 flex gap-4 flex-wrap">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <div>
                    <div className="font-semibold">Instant answers</div>
                    <div className="text-xs">Extracted from your emails with high accuracy</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Zap className="w-5 h-5 text-green-500" />
                  <div>
                    <div className="font-semibold">Auto fallbacks</div>
                    <div className="text-xs">QA first, generator as fallback — robust responses</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-2xl p-6 bg-gradient-to-b from-white to-indigo-50 dark:from-slate-800 dark:to-slate-700 shadow-2xl">
                <div className="text-xs uppercase text-muted-foreground font-medium">Live preview</div>

                <div className="mt-4 bg-white dark:bg-slate-900 rounded-lg p-4 border">
                  <div className="text-sm font-semibold">Inbox snippet</div>
                  <div className="mt-2 text-sm text-muted-foreground">Hello Brandon, This is the invoice INV-2025-07 for the website redesign project. The total amount due is ₹12,500.</div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded">
                      <div className="text-xs text-muted-foreground">Question</div>
                      <div className="mt-1 text-sm">Has Brandon paid his due?</div>
                    </div>

                    <div className="p-3 bg-indigo-600 text-white rounded flex items-center justify-between">
                      <div>
                        <div className="text-xs">Answer (extractive)</div>
                        <div className="mt-1 font-semibold text-sm">No — invoice INV-2025-07 shows ₹12,500 due.</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <Link href="/ask-question" className="text-sm underline">
                      Try it yourself
                    </Link>
                    <span className="text-xs text-muted-foreground">•</span>
                    <Link href="/send-emails" className="text-sm underline">
                      Add a test email
                    </Link>
                  </div>
                </div>
              </div>

              {/* decorative blobs */}
              <div className="absolute -left-8 -bottom-8 w-32 h-32 rounded-full bg-indigo-200 opacity-40 blur-3xl" />
              <div className="absolute -right-10 top-6 w-24 h-24 rounded-full bg-violet-200 opacity-30 blur-2xl" />
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="w-full max-w-5xl px-6 py-8">
          <h2 className="text-2xl font-bold">What MailMind does</h2>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Connect your email archive (or paste snippets), then ask natural language questions. MailMind finds the most
            relevant email sections using embeddings, extracts factual answers when possible, and falls back to a
            generator when needed.
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border bg-white/60 dark:bg-slate-900">
              <div className="font-semibold">Semantic search</div>
              <div className="text-sm text-muted-foreground mt-1">Embeddings power fuzzy & accurate retrieval.</div>
            </div>

            <div className="p-4 rounded-lg border bg-white/60 dark:bg-slate-900">
              <div className="font-semibold">Extractive QA</div>
              <div className="text-sm text-muted-foreground mt-1">Pull exact lines from emails for trustworthy answers.</div>
            </div>

            <div className="p-4 rounded-lg border bg-white/60 dark:bg-slate-900">
              <div className="font-semibold">Auto fallbacks</div>
              <div className="text-sm text-muted-foreground mt-1">Generators fill in when extraction isn't possible.</div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="w-full max-w-5xl px-6 py-8">
          <h3 className="text-xl font-bold">How it works</h3>
          <ol className="mt-4 space-y-3 list-decimal list-inside text-sm text-muted-foreground">
            <li>Ingest emails or paste snippets into the Send Email page.</li>
            <li>We embed the question, search for matching sections in Supabase, and try extractive QA.</li>
            <li>If extraction fails, a reliable generator crafts a concise answer using the found context.</li>
          </ol>
        </section>

        {/* CTA / FOOTER */}
        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-12">
          <div className="max-w-5xl w-full px-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm">
              <div className="font-semibold">Ready to try?</div>
              <div className="text-muted-foreground">Ask a question or drop a test email — results are instant.</div>
            </div>

            <div className="flex gap-3">
              <Link href="/ask-question" className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-indigo-600 text-white shadow hover:scale-105 transform transition">
                Ask Question
              </Link>
              <Link href="/send-emails" className="inline-flex items-center gap-2 px-4 py-2 rounded-md border bg-white/80 dark:bg-black/40">
                Send Email
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
