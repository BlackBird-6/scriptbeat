import { NextRequest } from "next/server";
import { extractTextFromPDF, parseScriptToScenes, ParsedScene } from "@/utils/parser";
import { getAnalysisPrompt } from "@/utils/prompts";
import Groq from "groq-sdk";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MAX_WORD_COUNT = 1200;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), { status: 400 });
    }

    let rawText = "";
    if (file.name.endsWith(".pdf")) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      rawText = await extractTextFromPDF(buffer);
    } else if (file.name.endsWith(".txt")) {
      rawText = await file.text();
    } else {
      return new Response(JSON.stringify({ error: "Unsupported file type" }), { status: 400 });
    }

    const allScenes = parseScriptToScenes(rawText);

    // Process scenes in batches
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    function sendEvent(data: any, eventType = "message") {
      writer.write(encoder.encode(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`));
    }

    // Process asynchronously and stream results
    (async () => {
      try {
        const MAX_TOKENS_PER_BATCH = 2500;
        const batches: ParsedScene[][] = [];
        let currentBatch: ParsedScene[] = [];
        let currentTokens = 0;

        for (const s of allScenes) {
          const estimatedTokens = Math.ceil(s.word_count * 1.3) + 100;
          if (currentBatch.length > 0 && currentTokens + estimatedTokens > MAX_TOKENS_PER_BATCH) {
            batches.push(currentBatch);
            currentBatch = [s];
            currentTokens = estimatedTokens;
          } else {
            currentBatch.push(s);
            currentTokens += estimatedTokens;
          }
        }
        if (currentBatch.length > 0) batches.push(currentBatch);

        sendEvent({ totalScenes: allScenes.length, totalBatches: batches.length }, "init");

        let previousTensionScore = 0;
        let globalSceneCounter = 1;

        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          const scenesContext = batch.map(s => `[SCENE ${s.scene_number}]\nWORDS: ${s.word_count}\nTEXT:\n${s.text}\n---\n`).join('');

          const prompt = getAnalysisPrompt(scenesContext);

          let success = false;
          let retries = 3;
          let delay = 3500;
          let parsedResults: any[] = [];

          while (!success && retries > 0) {
            try {
              const completion = await groq.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: "llama-3.1-8b-instant",
                response_format: { type: "json_object" },
                temperature: 0.1,
              });

              const content = completion.choices[0]?.message?.content;
              if (content) {
                const parsed = JSON.parse(content);
                if (parsed && Array.isArray(parsed.results)) {
                  parsedResults = parsed.results;
                  success = true;
                  console.log("Parsed Results:", JSON.stringify(parsedResults));
                }
              }

            } catch (err: any) {
              if (err.status === 429 || err.status === 413) {
                // Rate limit or payload too large
                await new Promise(r => setTimeout(r, delay));
                delay += 3000;
              } else if (err.code === "json_validate_failed" || err instanceof SyntaxError) {
                // JSON parse failed on groq's end (e.g. invalid string escape)
              } else {
                console.error("Unknown groq error loop:", err);
              }
              retries--;
            }
          }

          let finalBatchData: any[] = [];
          if (parsedResults.length > 0) {
            finalBatchData = parsedResults.map((r: any) => {
              const modelScore = typeof r.tension_score === 'number' ? r.tension_score : 0;
              const smoothedTension = Math.min(100, Math.round((0.5 * previousTensionScore) + 0.5 * modelScore));
              previousTensionScore = smoothedTension;

              return {
                scene_number: globalSceneCounter++,
                tension_score: modelScore,
                primary_emotion: r.primary_emotion || "Calm",
                summary: r.summary || "",
                score_justification: r.score_justification || "",
                sentiment: r.sentiment || "Neutral"
              };
            });
          } else {
            // Fallback for missing scenes if the entire batch failed
            finalBatchData = batch.map(s => {
              const smoothedTension = Math.min(100, Math.round(0.5 * previousTensionScore));
              previousTensionScore = smoothedTension;
              return {
                scene_number: globalSceneCounter++,
                tension_score: previousTensionScore,
                primary_emotion: "Calm",
                summary: "Analysis failed due to rate limit constraints.",
                score_justification: "Analysis failed.",
                sentiment: "Neutral"
              };
            });
          }

          sendEvent({ batch: i + 1, data: finalBatchData }, "batch");
          // Mandatory small delay per request to stay under 6000 TPM
          await new Promise(r => setTimeout(r, 1200));
        }
      } catch (err) {
        console.error("Scene processing error:", err);
        sendEvent({ error: String(err) }, "error");
      } finally {
        sendEvent({ done: true }, "done");
        writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}
