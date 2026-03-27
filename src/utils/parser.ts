import pdfParse from "pdf-parse";

export interface ParsedScene {
  scene_number: number;
  text: string;
  word_count: number;
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text;
}

export function parseScriptToScenes(text: string): ParsedScene[] {
  // Regex to match scene headings like "INT. COFFEE SHOP - DAY" or "EXT. STREET - NIGHT"
  const sceneHeadingRegex = /^\s*(?:INT\.|EXT\.|INT\/EXT\.|I\/E\.)\b.*$/gm;
  
  const scenes: ParsedScene[] = [];
  let match;
  let lastIndex = 0;
  let currentSceneNum = 1;

  const headings = [];
  
  // Find all headings
  while ((match = sceneHeadingRegex.exec(text)) !== null) {
    headings.push({ match: match[0], index: match.index });
  }

  // If no headings found, treat the whole thing as one scene
  if (headings.length === 0) {
    return [{
      scene_number: 1,
      text: text.trim(),
      word_count: text.trim().split(/\s+/).length
    }];
  }

  // Handle the text before the first scene heading (maybe title page or introduction)
  if (headings[0].index > 0) {
    const introText = text.substring(0, headings[0].index).trim();
    if (introText.length > 50) {
      scenes.push({
        scene_number: 0,
        text: introText,
        word_count: introText.split(/\s+/).length
      });
    }
  }

  // Split into scenes
  for (let i = 0; i < headings.length; i++) {
    const startIdx = headings[i].index;
    const endIdx = i + 1 < headings.length ? headings[i + 1].index : text.length;
    
    // The scene text includes the heading itself
    const sceneText = text.substring(startIdx, endIdx).trim();
    
    // Calculate word count
    const word_count = sceneText.split(/\s+/).filter(w => w.length > 0).length;

    scenes.push({
      scene_number: currentSceneNum++,
      text: sceneText,
      word_count
    });
  }

  return scenes;
}
