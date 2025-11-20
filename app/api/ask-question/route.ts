// app/api/ask-question/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabase: SupabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const HF_API_KEY = process.env.HF_API_KEY;
if (!HF_API_KEY) {
  console.warn("Warning: HF_API_KEY is not set. API calls will fail without it.");
}

/**
 * Get embedding from HF (feature-extraction pipeline)
 */
async function getHfEmbedding(text: string, model = "sentence-transformers/all-MiniLM-L6-v2"): Promise<number[]> {
  if (!HF_API_KEY) throw new Error("HF_API_KEY not set");

  const url = `https://router.huggingface.co/hf-inference/models/${encodeURIComponent(model)}/pipeline/feature-extraction`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${HF_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ inputs: text }),
  });

  const txt = await resp.text();
  console.log("getHfEmbedding ->", model, "status:", resp.status);
  console.log("getHfEmbedding -> body (truncated):", txt.slice(0, 1000));
  if (!resp.ok) throw new Error(`HF embedding error: ${resp.status} ${txt}`);

  const json = JSON.parse(txt);
  // normalize shapes
  if (Array.isArray(json) && typeof json[0] === "number") return json as number[];
  if (Array.isArray(json) && Array.isArray(json[0]) && typeof json[0][0] === "number") return json[0] as number[];
  if (json.embedding && Array.isArray(json.embedding)) return json.embedding;
  if (json.embeddings) {
    if (Array.isArray(json.embeddings[0]) && typeof json.embeddings[0][0] === "number") return json.embeddings[0];
    if (typeof json.embeddings[0] === "number") return json.embeddings;
  }
  if (json.data && Array.isArray(json.data) && json.data[0]?.embedding) return json.data[0].embedding;

  throw new Error("Unexpected HF embedding response shape");
}

/**
 * Try question-answering (extractive) against a QA model (returns null if not useful)
 */
async function tryExtractiveQA(question: string, context: string, model = "deepset/roberta-base-squad2"): Promise<{ answer: string; score?: number } | null> {
  if (!HF_API_KEY) throw new Error("HF_API_KEY not set");

  try {
    const url = `https://router.huggingface.co/hf-inference/models/${encodeURIComponent(model)}/pipeline/question-answering`;
    console.log("tryExtractiveQA -> trying model:", model);
    const resp = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${HF_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: { question, context } }),
    });

    const txt = await resp.text();
    console.log(`tryExtractiveQA -> model ${model} status ${resp.status} body(truncated):`, txt.slice(0, 1000));

    if (!resp.ok) {
      console.warn(`tryExtractiveQA -> model ${model} failed: ${resp.status}`);
      return null;
    }

    const json = JSON.parse(txt);
    // expected shapes: { answer: "...", score: 0.xx, start: N, end: N } or array like [{ answer, score }]
    if (Array.isArray(json) && json.length && typeof json[0].answer === "string") {
      return { answer: json[0].answer, score: json[0].score };
    }
    if (json.answer && typeof json.answer === "string") {
      return { answer: json.answer, score: json.score };
    }
    return null;
  } catch (err) {
    console.error("tryExtractiveQA error:", err);
    return null;
  }
}

/**
 * Try to generate from a list of HF models (fallbacks).
 * This function will attempt both the 'text-generation' pipeline and
 * then 'text2text-generation' (for T5/flan models) if the first fails.
 */
async function tryGenerateWithFallbacks(prompt: string, models: string[]): Promise<string> {
  if (!HF_API_KEY) throw new Error("HF_API_KEY not set");

  for (const model of models) {
    // 1) try text-generation pipeline
    try {
      const url = `https://router.huggingface.co/hf-inference/models/${encodeURIComponent(model)}/pipeline/text-generation`;
      console.log("tryGenerateWithFallbacks -> trying model (text-generation):", model);
      const payload = { inputs: prompt, parameters: { max_new_tokens: 256, temperature: 0.0, do_sample: false } };
      const resp = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${HF_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const txt = await resp.text();
      console.log(`generate -> model ${model} status ${resp.status} body(truncated):`, txt.slice(0, 1000));

      if (resp.ok) {
        const json = JSON.parse(txt);
        if (Array.isArray(json) && json.length && typeof json[0].generated_text === "string") return json[0].generated_text;
        if (json.generated_text && typeof json.generated_text === "string") return json.generated_text;
        if (Array.isArray(json) && json.length && typeof json[0].text === "string") return json[0].text;
        // fallback: return trimmed JSON string if we can't find generated_text
        return JSON.stringify(json).slice(0, 4000);
      } else {
        console.warn(`generate -> model ${model} (text-generation) failed: ${resp.status}`);
      }
    } catch (err) {
      console.error("generate attempt error (text-generation) for model", model, err);
    }

    // 2) try text2text-generation pipeline (T5/Flan style)
    try {
      const url2 = `https://router.huggingface.co/hf-inference/models/${encodeURIComponent(model)}/pipeline/text2text-generation`;
      console.log("tryGenerateWithFallbacks -> trying model (text2text-generation):", model);
      const payload2 = { inputs: prompt, parameters: { max_new_tokens: 256, temperature: 0.0 } };
      const resp2 = await fetch(url2, {
        method: "POST",
        headers: { Authorization: `Bearer ${HF_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload2),
      });
      const txt2 = await resp2.text();
      console.log(`generate (text2text) -> model ${model} status ${resp2.status} body(truncated):`, txt2.slice(0, 1000));

      if (resp2.ok) {
        const json2 = JSON.parse(txt2);
        if (Array.isArray(json2) && json2.length && typeof json2[0].generated_text === "string") return json2[0].generated_text;
        if (json2.generated_text && typeof json2.generated_text === "string") return json2.generated_text;
        if (Array.isArray(json2) && json2.length && typeof json2[0].text === "string") return json2[0].text;
        if (Array.isArray(json2) && json2.length && typeof json2[0].generated_text === "string") return json2[0].generated_text;
        return JSON.stringify(json2).slice(0, 4000);
      } else {
        console.warn(`generate -> model ${model} (text2text-generation) failed: ${resp2.status}`);
      }
    } catch (err) {
      console.error("generate attempt error (text2text-generation) for model", model, err);
    }
  }

  throw new Error("All generation models failed or were unavailable");
}

/**
 * Main API handler
 * POST body:
 *   { question: string, email_filter?: string|null, generateIfNoContext?: boolean, match_threshold?: number }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const bodyJson = await request.json();
    const question = (bodyJson?.question || "").trim();
    // Accept explicit null to skip filter; default is "brandon@gmail.com"
    const emailFilter: string | null = bodyJson?.email_filter === undefined ? "brandon@gmail.com" : bodyJson?.email_filter;
    const generateIfNoContext = !!bodyJson?.generateIfNoContext;
    const matchThreshold = typeof bodyJson?.match_threshold === "number" ? bodyJson.match_threshold : -0.3;

    if (!question) return NextResponse.json({ error: "Missing question" }, { status: 400 });

    console.log("ask-question -> question length:", question.length, "emailFilter:", emailFilter, "matchThreshold:", matchThreshold);

    // 1) embed the question
    const questionEmbedding = await getHfEmbedding(question, "sentence-transformers/all-MiniLM-L6-v2");
    console.log("ask-question -> questionEmbedding length:", questionEmbedding.length);

    // 2) call Supabase RPC for similarity search
    const { data: matchingSections, error } = await supabase.rpc("match_filtered_email_sections", {
      query_embedding: questionEmbedding,
      match_threshold: matchThreshold,
      match_count: 10,
      email_address: emailFilter, // can be a string or null
    });

    if (error) {
      console.error("Supabase RPC error:", error);
      throw new Error(error.message || "Supabase RPC failed");
    }

    console.log("ask-question -> matchingSections length:", Array.isArray(matchingSections) ? matchingSections.length : 0);
    console.log("ask-question -> matchingSections sample (truncated):", JSON.stringify(matchingSections?.slice?.(0, 5) ?? [], null, 2).slice(0, 2000));

    const contextArr = (matchingSections || []).map((r: any) => r.section_content).filter(Boolean);
    const context = contextArr.join("\n\n");
    console.log("ask-question -> context length (chars):", context.length);

    // If no context found
    if (!context) {
      const noContextMsg = "No relevant email content was found for that query.";
      console.warn("ask-question -> no context found for query");

      if (!generateIfNoContext) {
        return NextResponse.json({ answer: null, info: noContextMsg, contextFound: false }, { status: 200 });
      }
      // else fall through to generate a general answer (inform the user in response)
    }

    // 3) If context present, try extractive QA first (more accurate for factual email queries)
    if (context) {
      try {
        const qaResult = await tryExtractiveQA(question, context, "deepset/roberta-base-squad2");
        if (qaResult && qaResult.answer && qaResult.answer.trim()) {
          console.log("ask-question -> extractive QA answer found (score:", qaResult.score, ")");
          // Small additional check: if the answer is generic like ' ' or 'no answer', keep fallback generation
          const ansTrim = qaResult.answer.trim();
          if (ansTrim.length > 0) {
            return NextResponse.json({ answer: ansTrim, contextFound: true, source: "extractive-qa", score: qaResult.score ?? null }, { status: 200 });
          }
        }
      } catch (qaErr) {
        console.warn("ask-question -> extractive QA failed:", qaErr);
      }
    }

    // 4) build prompt (include context if present)
    const systemPrefix = `You are an assistant that will use the provided context to answer the question concisely and accurately. Use only the provided context unless asked otherwise.`;
    const prompt = `${systemPrefix}\n\nContext:\n${context || "(no context available)"}\n\nQuestion:\n${question}\n\nAnswer:`;

    // 5) generation: try multiple HF models (fallbacks)
    const genModels = [
      "distilgpt2",
      "gpt2-medium",
      "facebook/opt-350m"
    ];

    let generated: string;
    try {
      generated = await tryGenerateWithFallbacks(prompt, genModels);
    } catch (genErr) {
      console.error("ask-question -> all generation models failed:", genErr);
      return NextResponse.json({ error: "Failed to generate answer: no available HF generation model." }, { status: 502 });
    }

    const answer = generated.trim();
    console.log("ask-question -> generated answer length:", answer.length);

    if (!context) {
      return NextResponse.json({ answer, info: "No matching email content found — returned a general answer.", contextFound: false }, { status: 200 });
    }

    return NextResponse.json({ answer, contextFound: true, source: "generation" }, { status: 200 });
  } catch (err: any) {
    console.error("Error in ask-question API:", err?.message ?? err);
    return NextResponse.json({ error: err.message || "Failed to generate response" }, { status: 500 });
  }
}

