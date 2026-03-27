// Vercel Serverless / Node.js polyfills for pdf.js dependencies
if (typeof global.DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class DOMMatrix {};
}
if (typeof global.Path2D === 'undefined') {
  (global as any).Path2D = class Path2D {};
}

const { PDFParse } = require("pdf-parse");

export interface ParsedScene {
  scene_number: number;
  text: string;
  word_count: number;
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  await parser.destroy();
  return result.text;
}

export function parseScriptToScenes(text: string): ParsedScene[] {
  const sceneHeadingRegex = /^\s*(?:\[?[0-9]{1,3}[A-Z]?(?:\.)?\]?\s+)?(?:INT\.|EXT\.|INT\/EXT\.|I\/E\.|INT\s|EXT\s).*$/gim;

  const rawScenes: ParsedScene[] = [];
  let match;
  let currentSceneNum = 1;

  const headings = [];

  while ((match = sceneHeadingRegex.exec(text)) !== null) {
    headings.push({ match: match[0], index: match.index });
  }

  if (headings.length === 0) {
    rawScenes.push({
      scene_number: 1,
      text: text.trim(),
      word_count: text.trim().split(/\s+/).length
    });
  } else {
    if (headings[0].index > 0) {
      const introText = text.substring(0, headings[0].index).trim();
      if (introText.length > 50) {
        rawScenes.push({
          scene_number: 0,
          text: introText,
          word_count: introText.split(/\s+/).length
        });
      }
    }

    for (let i = 0; i < headings.length; i++) {
      const startIdx = headings[i].index;
      const endIdx = i + 1 < headings.length ? headings[i + 1].index : text.length;
      const sceneText = text.substring(startIdx, endIdx).trim();
      const word_count = sceneText.split(/\s+/).filter(w => w.length > 0).length;

      rawScenes.push({
        scene_number: currentSceneNum++,
        text: sceneText,
        word_count
      });
    }
  }

  const finalScenes: ParsedScene[] = [];
  let displaySceneNum = 1;
  const CHUNK_MAX = 800;

  for (const s of rawScenes) {
    if (s.word_count > CHUNK_MAX) {
      const words = s.text.split(/\s+/);
      for (let i = 0; i < words.length; i += CHUNK_MAX) {
        const chunk = words.slice(i, i + CHUNK_MAX).join(" ");
        finalScenes.push({
          scene_number: displaySceneNum++,
          text: chunk,
          word_count: words.slice(i, i + CHUNK_MAX).length
        });
      }
    } else {
      finalScenes.push({ ...s, scene_number: displaySceneNum++ });
    }
  }

  return finalScenes;
}
