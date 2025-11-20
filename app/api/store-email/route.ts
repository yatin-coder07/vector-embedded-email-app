// app/api/store-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

/**
 * Types
 */
interface Email {
  subject: string;
  sender: string;
  recipient: string[];
  cc?: string[];
  bcc?: string[];
  body: string;
}

interface EmailSection {
  email_id: number;
  section_content: string;
  embedding: number[];
  section_order: number;
}

/**
 * Supabase client
 */
const supabase: SupabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Validation
 */
const emailSchema = z.object({
  subject: z.string(),
  sender: z.string().email(),
  recipient: z.array(z.string().email()),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  body: z.string(),
});

/**
 * Chunker
 */
function splitIntoChunks(text: string, chunkSize: number = 2000): string[] {
  const words = text.split(" ");
  const chunks: string[] = [];
  let currentChunk = "";

  for (const word of words) {
    if (currentChunk.length + word.length + 1 > chunkSize) {
      chunks.push(currentChunk);
      currentChunk = word;
    } else {
      currentChunk += (currentChunk ? " " : "") + word;
    }
  }

  if (currentChunk) chunks.push(currentChunk);

  return chunks;
}

/**
 * Hugging Face embedding helper — uses the ROUTER embeddings path that works for many models:
 *   /hf-inference/models/<model>/pipeline/feature-extraction
 *
 * This will:
 *  - try the models/<model>/pipeline/feature-extraction path first (recommended for embeddings)
 *  - fallback to the simpler hf-inference/<model> path if needed
 *
 * Logs status and truncated response for debugging.
 */
async function getHfEmbedding(
  text: string,
  model = "sentence-transformers/all-MiniLM-L6-v2"
): Promise<number[]> {
  const HF_API_KEY = process.env.HF_API_KEY;
  if (!HF_API_KEY) throw new Error("HF_API_KEY not set in environment");

  const encodedModel = encodeURIComponent(model);

  // Primary (recommended for embeddings) — uses models + pipeline
  const urlPrimary = `https://router.huggingface.co/hf-inference/models/${encodedModel}/pipeline/feature-extraction`;
  // Fallback (some docs/examples use this; may be 404 for some models)
  const urlFallback = `https://router.huggingface.co/hf-inference/${encodedModel}`;

  const body = JSON.stringify({ inputs: text });

  const tryEndpoints = [urlPrimary, urlFallback];

  for (const url of tryEndpoints) {
    // Attempt each endpoint with retries
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`getHfEmbedding -> Trying URL: ${url} (attempt ${attempt})`);
        const resp = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${HF_API_KEY}`,
            "Content-Type": "application/json",
          },
          body,
        });

        const textBody = await resp.text();
        console.log(`getHfEmbedding -> status ${resp.status} for ${url} (attempt ${attempt})`);
        console.log("getHfEmbedding -> body (truncated):", textBody.slice(0, 1000));

        if (!resp.ok) {
          // Retry on transient server errors / rate limits
          if (resp.status === 429 || resp.status >= 500) {
            const backoff = 300 * attempt;
            console.warn(`getHfEmbedding -> transient ${resp.status}, retrying after ${backoff}ms`);
            await new Promise((r) => setTimeout(r, backoff));
            continue;
          }
          // For 404/422/etc we should try the next endpoint (if any) or fail
          throw new Error(`Hugging Face API error: ${resp.status} ${textBody}`);
        }

        // parse JSON
        let json: any;
        try {
          json = JSON.parse(textBody);
        } catch (e) {
          throw new Error("Failed to parse HF response JSON: " + textBody.slice(0, 500));
        }

        // Normalize shapes:
        if (Array.isArray(json) && json.length && typeof json[0] === "number") return json as number[];
        if (Array.isArray(json) && Array.isArray(json[0]) && typeof json[0][0] === "number")
          return json[0] as number[];
        if (json.embedding && Array.isArray(json.embedding)) return json.embedding as number[];
        if (json.embeddings) {
          if (Array.isArray(json.embeddings[0]) && typeof json.embeddings[0][0] === "number")
            return json.embeddings[0] as number[];
          if (typeof json.embeddings[0] === "number") return json.embeddings as number[];
        }
        if (json.data && Array.isArray(json.data) && json.data[0]?.embedding) return json.data[0].embedding as number[];

        // Unexpected
        throw new Error("Unexpected HF embeddings response shape: " + JSON.stringify(json).slice(0, 500));
      } catch (err: any) {
        console.error(`getHfEmbedding -> attempt error for ${url}:`, err?.message ?? err);
        // if last attempt for this endpoint -> break to try next endpoint
        if (attempt === maxAttempts) {
          console.warn(`getHfEmbedding -> exhausted attempts for ${url}`);
          break;
        }
        await new Promise((r) => setTimeout(r, 250 * attempt));
        continue;
      }
    } // end attempts for this endpoint
  } // end endpoints

  throw new Error("Failed to fetch embedding from Hugging Face with any endpoint");
}

/**
 * POST handler
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log("store-email POST called");
    const requestData = await request.json();
    console.log("Request data parsed:", requestData);

    const validationResult = emailSchema.safeParse(requestData);
    console.log("Validation result:", validationResult);

    if (!validationResult.success) {
      console.error("Validation failed:", validationResult.error.errors);
      return NextResponse.json(
        { error: "Invalid email data", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { subject, sender, recipient, cc, bcc, body }: Email = validationResult.data;

    // Insert root email
    const { data: email, error: emailError } = await supabase
      .from("emails")
      .insert([{ subject, sender, recipient, cc, bcc, body }])
      .select("id")
      .single();

    if (emailError) {
      console.error("Error inserting email:", emailError);
      throw new Error(emailError.message || "Failed to insert email");
    }

    const emailId: number = email.id;
    console.log("Inserted email id:", emailId);

    // Split into chunks
    const chunks = splitIntoChunks(body);
    console.log("Body split into chunks:", chunks.length);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Processing chunk ${i + 1}/${chunks.length}`);

      const embedding = await getHfEmbedding(chunk, "sentence-transformers/all-MiniLM-L6-v2");
      if (!Array.isArray(embedding)) throw new Error("Embedding not an array");

      const expectedDim = 384;
      if (embedding.length !== expectedDim) {
        console.warn(`Warning: embedding dim ${embedding.length} != expected ${expectedDim}.`);
      }

      const section: EmailSection = {
        email_id: emailId,
        section_content: chunk,
        embedding,
        section_order: i + 1,
      };

      const { error: sectionError } = await supabase.from("email_sections").insert([section]);
      if (sectionError) {
        console.error("Error inserting section:", sectionError);
        throw new Error(sectionError.message || "Failed to insert email section");
      }

      console.log(`Inserted section ${i + 1} for email ${emailId}`);
    }

    console.log("Email stored successfully!");
    return NextResponse.json({ message: "Email stored successfully!" }, { status: 200 });
  } catch (error: any) {
    console.error("Error storing email:", error?.message ?? error);
    return NextResponse.json({ error: error.message || "Failed to store email" }, { status: 500 });
  }
}
