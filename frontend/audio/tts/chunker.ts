/**
 * TTS Chunker - Ultra low-latency, natural TTS chunking
 * 
 * Ported from Python chunker.py
 * 
 * Goals:
 * - Very fast first audio (tiny first chunk)
 * - Natural prosody for remaining chunks
 * - No micro-chunks that cause hallucination
 */

const SOFT_BREAKS = new Set([
  "and", "but", "so", "because", "while", "though",
  "if", "when", "where", "which", "that", "with", "for"
]);

const HARD_BREAKS = new Set([",", ".", "?", "!"]);

/**
 * Split text into sentences using simple regex-based approach
 */
function splitIntoSentences(text: string): string[] {
  // Replace em dashes and ellipsis with commas
  const normalized = text.replace(/—/g, ",").replace(/…/g, ",").replace(/\n/g, " ").trim();
  
  if (!normalized) {
    return [];
  }

  // Split on sentence boundaries (., !, ?) followed by space or end of string
  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  return sentences.length > 0 ? sentences : [normalized];
}

/**
 * Ultra low-latency, natural TTS chunker.
 * 
 * @param text - The text to chunk
 * @returns Array of text chunks optimized for TTS
 */
export function ttsChunks(text: string): string[] {
  // Normalize text
  const normalized = text
    .replace(/—/g, ",")
    .replace(/…/g, ",")
    .replace(/\n/g, " ")
    .trim();

  if (!normalized) {
    return [];
  }

  // Split into sentences first
  const sentences = splitIntoSentences(normalized);
  
  // Extract all words from sentences
  const words: string[] = [];
  for (const sent of sentences) {
    const sentWords = sent.trim().split(/\s+/);
    words.push(...sentWords);
  }

  if (words.length === 0) {
    return [];
  }

  const chunks: string[] = [];

  // -----------------------------
  // 1. FIRST CHUNK (FAST START)
  // -----------------------------
  const firstChunk: string[] = [];
  for (const w of words) {
    firstChunk.push(w);
    if (firstChunk.length >= 4) {
      break;
    }
  }

  chunks.push(firstChunk.join(" "));
  let idx = firstChunk.length;

  // -----------------------------
  // 2. NORMAL SPEECH CHUNKS
  // -----------------------------
  const current: string[] = [];
  for (let i = idx; i < words.length; i++) {
    const w = words[i];
    current.push(w);

    const wordClean = w.toLowerCase().replace(/[,\.?!]/g, "");

    // Natural place to break
    const lastChar = w[w.length - 1];
    const shouldBreak =
      HARD_BREAKS.has(lastChar) ||
      (SOFT_BREAKS.has(wordClean) && current.length >= 8) ||
      current.length >= 14;

    if (shouldBreak) {
      chunks.push(current.join(" "));
      current.length = 0; // Clear array
    }
  }

  if (current.length > 0) {
    chunks.push(current.join(" "));
  }

  // -----------------------------
  // 3. MERGE MICRO-CHUNKS
  // -----------------------------
  const finalChunks: string[] = [];
  for (const chunk of chunks) {
    const wordCount = chunk.split(/\s+/).length;
    if (finalChunks.length > 0 && (wordCount < 4 || chunk.length < 15)) {
      finalChunks[finalChunks.length - 1] += " " + chunk;
    } else {
      finalChunks.push(chunk);
    }
  }

  return finalChunks;
}


