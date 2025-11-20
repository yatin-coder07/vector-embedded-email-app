"use client";

import React, { useEffect, useRef, useState } from "react";
import { Mail, User, Plus, X, Paperclip, Check } from "lucide-react";
import Link from "next/link";

/**
 * SendEmailPage
 * - Keeps the same submit behavior (POST /api/store-email)
 * - Adds a beautiful, interactive UI: recipient chips, CC/BCC toggle, live preview, animated send button
 * - No external libs required beyond lucide-react + Tailwind classes (matches theme from your other pages)
 */

type EmailForm = {
  subject: string;
  sender: string;
  recipients: string[]; // parsed list
  ccList: string[];
  bccList: string[];
  body: string;
};

export default function SendEmailPage() {
  const [subject, setSubject] = useState("");
  const [sender, setSender] = useState("");
  const [recipientRaw, setRecipientRaw] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [ccRaw, setCcRaw] = useState("");
  const [ccList, setCcList] = useState<string[]>([]);
  const [bccRaw, setBccRaw] = useState("");
  const [bccList, setBccList] = useState<string[]>([]);
  const [body, setBody] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  const recipientInputRef = useRef<HTMLInputElement | null>(null);

  // transient toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // helper: add email(s) from a raw string (commas/newlines)
  const addEmailsFromString = (raw: string, setter: (s: string[]) => void) => {
    if (!raw) return;
    const parts = raw
      .split(/[,;\n]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    setter((prev) => {
      const merged = [...prev, ...parts];
      // unique
      return Array.from(new Set(merged));
    });
  };

  const onRecipientKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === ";") {
      e.preventDefault();
      addEmailsFromString(recipientRaw, setRecipients);
      setRecipientRaw("");
    } else if (e.key === "Backspace" && recipientRaw === "" && recipients.length > 0) {
      // remove last chip on backspace
      setRecipients((r) => r.slice(0, -1));
    }
  };

  const onCcKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === ";") {
      e.preventDefault();
      addEmailsFromString(ccRaw, setCcList);
      setCcRaw("");
    }
  };

  const onBccKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === ";") {
      e.preventDefault();
      addEmailsFromString(bccRaw, setBccList);
      setBccRaw("");
    }
  };

  const removeRecipient = (email: string) => setRecipients((r) => r.filter((x) => x !== email));
  const removeCc = (email: string) => setCcList((r) => r.filter((x) => x !== email));
  const removeBcc = (email: string) => setBccList((r) => r.filter((x) => x !== email));

  const resetForm = () => {
    setSubject("");
    setSender("");
    setRecipientRaw("");
    setRecipients([]);
    setCcRaw("");
    setCcList([]);
    setBccRaw("");
    setBccList([]);
    setBody("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // ensure raw fields pushed into lists if user didn't press enter
    addEmailsFromString(recipientRaw, setRecipients);
    addEmailsFromString(ccRaw, setCcList);
    addEmailsFromString(bccRaw, setBccList);

    // minimal validation
    if (!subject.trim() || !sender.trim() || recipients.length === 0 || !body.trim()) {
      setToast({ type: "error", text: "Please fill subject, sender, at least one recipient and body." });
      return;
    }

    setIsLoading(true);
    console.log("Form submission started");
    try {
      const emailData: EmailForm = {
        subject,
        sender,
        recipients,
        ccList,
        bccList,
        body,
      };

      console.log("Email data to be sent:", emailData);

      const response = await fetch("/api/store-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject,
          sender,
          recipient: recipients,
          cc: ccList,
          bcc: bccList,
          body,
        }),
      });

      console.log("Response status:", response.status);

      if (response.ok) {
        setToast({ type: "success", text: "Email stored successfully!" });
        resetForm();
      } else {
        const txt = await response.text();
        console.error("Failed to submit email data. Response:", response.status, txt);
        setToast({ type: "error", text: "Failed to submit email data." });
      }
    } catch (error) {
      console.error("Error submitting email data:", error);
      setToast({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setIsLoading(false);
      console.log("Form submission ended");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 py-12 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* FORM */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 dark:bg-indigo-900 p-2 rounded-lg">
                <Mail className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Compose Test Email</h2>
                <p className="text-xs text-muted-foreground">Store emails into the system for retrieval & QA testing</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/" className="text-sm text-muted-foreground hover:underline">
                Back home
              </Link>
              <button
                onClick={() => setShowPreview((s) => !s)}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-md border bg-white/80 dark:bg-black/40 text-sm"
                title="Toggle preview"
              >
                {showPreview ? "Hide preview" : "Show preview"}
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 flex-1">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Invoice INV-2025-07 reminder"
                className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Sender</label>
              <div className="flex gap-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-l-lg border border-r-0 bg-white/60 dark:bg-slate-800">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
                <input
                  value={sender}
                  onChange={(e) => setSender(e.target.value)}
                  placeholder="you@company.com"
                  className="flex-1 rounded-r-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Recipients</label>
              <div className="rounded-lg border px-3 py-2 bg-transparent min-h-[48px]">
                <div className="flex flex-wrap gap-2">
                  {recipients.map((r) => (
                    <div key={r} className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-800 rounded-full text-sm">
                      <span className="text-xs truncate max-w-[10rem]">{r}</span>
                      <button type="button" onClick={() => removeRecipient(r)} className="p-1 rounded-full hover:bg-white/20">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  <input
                    ref={recipientInputRef}
                    value={recipientRaw}
                    onChange={(e) => setRecipientRaw(e.target.value)}
                    onKeyDown={onRecipientKeyDown}
                    placeholder={recipients.length === 0 ? "Type or paste emails and press Enter" : "Add more... (press Enter)"}
                    className="flex-1 min-w-[140px] bg-transparent focus:outline-none px-2 py-1 text-sm"
                  />
                </div>

                <div className="mt-2 text-xs text-muted-foreground">Separate multiple emails with Enter, comma, or semicolon.</div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setShowCcBcc((s) => !s);
                    // focus the CC input when opening
                    setTimeout(() => document.getElementById("cc-input")?.focus(), 80);
                  }}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-md border bg-white/80 dark:bg-black/40"
                >
                  <Paperclip className="w-4 h-4" /> CC / BCC
                </button>

                <button
                  type="button"
                  onClick={() => {
                    // quick-add the sample invoice email used elsewhere
                    setSubject("Invoice INV-2025-07 for website redesign");
                    setSender("billing@studio.com");
                    setRecipients((r) => Array.from(new Set([...r, "brandon@gmail.com"])));
                    setBody("Hello Brandon, This is the invoice INV-2025-07 for the website redesign project. The total amount due is ₹12,500.");
                  }}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-md border bg-white/80 dark:bg-black/40 text-sm"
                >
                  <Plus className="w-4 h-4" /> Quick sample
                </button>
              </div>

              <div className="text-xs text-muted-foreground">You can store emails for testing retrieval & QA.</div>
            </div>

            {showCcBcc && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">CC</label>
                  <div className="rounded-lg border px-3 py-2 min-h-[48px]">
                    <div className="flex flex-wrap gap-2">
                      {ccList.map((c) => (
                        <div key={c} className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-sm">
                          <span className="text-xs truncate max-w-[10rem]">{c}</span>
                          <button type="button" onClick={() => removeCc(c)} className="p-1 rounded-full hover:bg-white/20">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <input
                        id="cc-input"
                        value={ccRaw}
                        onChange={(e) => setCcRaw(e.target.value)}
                        onKeyDown={onCcKeyDown}
                        placeholder="Add CC"
                        className="flex-1 min-w-[120px] bg-transparent focus:outline-none px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">BCC</label>
                  <div className="rounded-lg border px-3 py-2 min-h-[48px]">
                    <div className="flex flex-wrap gap-2">
                      {bccList.map((b) => (
                        <div key={b} className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-sm">
                          <span className="text-xs truncate max-w-[10rem]">{b}</span>
                          <button type="button" onClick={() => removeBcc(b)} className="p-1 rounded-full hover:bg-white/20">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <input
                        value={bccRaw}
                        onChange={(e) => setBccRaw(e.target.value)}
                        onKeyDown={onBccKeyDown}
                        placeholder="Add BCC"
                        className="flex-1 min-w-[120px] bg-transparent focus:outline-none px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write the email body here..."
                className="w-full min-h-[140px] rounded-lg border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-transparent resize-vertical"
                required
              />
            </div>

            <div className="flex items-center gap-3 mt-2">
              <button
                type="submit"
                disabled={isLoading}
                className={`inline-flex items-center gap-3 px-5 py-2 rounded-lg text-white font-semibold shadow-md transform transition-all ${
                  isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:scale-[1.02]"
                }`}
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Mail className="w-4 h-4" /> <span>Send Email</span>
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  resetForm();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-white/80 dark:bg-black/40"
              >
                Reset
              </button>

              <div className="ml-auto text-xs text-muted-foreground">Stored emails are searchable for QA tests.</div>
            </div>
          </form>
        </div>

        {/* PREVIEW */}
        {showPreview && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Live Preview</h3>
              <div className="text-xs text-muted-foreground">How the stored email will look</div>
            </div>

            <div className="flex-1 overflow-auto space-y-4">
              <div className="rounded-lg border p-4 bg-white/50 dark:bg-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">From</div>
                    <div className="font-medium">{sender || "you@company.com"}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">To</div>
                    <div className="font-medium">{recipients.join(", ") || "recipient@example.com"}</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-xs text-muted-foreground">Subject</div>
                  <div className="font-semibold mt-1">{subject || "No subject"}</div>
                </div>

                <div className="mt-4 border-t pt-4">
                  <div className="text-xs text-muted-foreground">Message</div>
                  <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{body || "Your message preview appears here..."}</div>
                </div>
              </div>

              <div className="rounded-lg border p-4 bg-slate-50 dark:bg-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-indigo-100 dark:bg-indigo-900">
                    <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
                  </div>
                  <div>
                    <div className="font-semibold">Stored for QA & retrieval</div>
                    <div className="text-xs text-muted-foreground">This email will be available for semantic search and extractive QA tests.</div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-3 flex items-center gap-3">
                <Paperclip className="w-5 h-5" />
                <div>
                  <div className="font-semibold">Attachments</div>
                  <div className="text-xs text-muted-foreground">Attach files later if your backend supports it.</div>
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-muted-foreground">Tip: Use the <span className="font-semibold">Quick sample</span> button to prefill a test invoice email.</div>
          </div>
        )}
      </div>

      {/* toast */}
      {toast && (
        <div
          className={`fixed right-6 bottom-6 rounded-lg px-4 py-3 shadow-lg ${
            toast.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
