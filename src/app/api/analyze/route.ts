import { NextRequest } from "next/server";
import { extractTextFromPDF, parseScriptToScenes, ParsedScene } from "@/utils/parser";
import Groq from "groq-sdk";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MAX_WORD_COUNT = 3000;

interface SceneBatch {
  scenes: ParsedScene[];
  totalWords: number;
}

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

    // Group scenes into batches
    const batches: SceneBatch[] = [];
    let currentBatch: SceneBatch = { scenes: [], totalWords: 0 };

    for (const scene of allScenes) {
      if (currentBatch.totalWords + scene.word_count > MAX_WORD_COUNT && currentBatch.scenes.length > 0) {
        batches.push(currentBatch);
        currentBatch = { scenes: [], totalWords: 0 };
      }
      currentBatch.scenes.push(scene);
      currentBatch.totalWords += scene.word_count;
    }
    if (currentBatch.scenes.length > 0) {
      batches.push(currentBatch);
    }

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    function sendEvent(data: any, eventType = "message") {
      writer.write(encoder.encode(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`));
    }

    // Process asynchronously and stream results
    (async () => {
      try {
        sendEvent({ type: "init", totalScenes: allScenes.length, totalBatches: batches.length }, "init");

        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          const sceneContext = batch.scenes.map(
            (s) => `[SCENE ${s.scene_number}]\nWORDS: ${s.word_count}\nTEXT:\n${s.text}\n---\n`
          ).join("\n");

          const prompt = `You are a script pacing analyzer. Analyze the following screenplay scenes. 
For EACH scene, calculate a tension score (0 to 100), identify the primary dominant emotion (choose one from: Fear, Suspense, Sadness, Anger, Calm, Joy, Surprise, Anticipation), summarize the scene (max 2 sentences), provide a brief dialogue snippet (if any dialogue exists), identify the key narrative elements (e.g., Conflict, Action, Pacing: High, etc. max 3 short tags), and the overall sentiment (Positive, Negative, Neutral).

Respond ONLY with a JSON array mapping to the scenes provided.
Schema example:
[
  {
    "scene_number": 1,
    "tension_score": 85,
    "primary_emotion": "Suspense",
    "summary": "...",
    "dialogue_snippet": "Character: 'Line'",
    "elements": ["Conflict", "Pacing: High"],
    "sentiment": "Negative"
  }
]

Scenes to analyze:
${sceneContext}`;

          const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.1-8b-instant",
            response_format: { type: "json_object" }, // Wait, array is not always directly returned. Better to prompt for an object {"results": [...]}
            temperature: 0.1,
          });

          // Groq JSON object mode requires the prompt to specify JSON and return an object.
          // Let me revise the prompt to ask for {"results": [...]}
        }
      } catch (err) {
        console.error("Batch processing error:", err);
        sendEvent({ error: String(err) }, "error");
      } finally {
        sendEvent({ type: "done" }, "done");
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
