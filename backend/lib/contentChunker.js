/**
 * contentChunker.js
 * 
 * Handles page content splitting for long texts to avoid exceeding model token thresholds.
 * Employs sliding overlap windows (1500 words chunk size, 100 words overlap).
 */

/**
 * Splits text into array of overlapping text chunks.
 * @param {string} text - The input text.
 * @param {number} [chunkSize=1500] - Word count per chunk.
 * @param {number} [overlap=100] - Overlapping words between adjacent chunks.
 * @returns {string[]} An array of text chunks.
 */
export function chunkText(text, chunkSize = 1500, overlap = 100) {
  if (!text) return [];
  
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= chunkSize) {
    return [text];
  }

  const chunks = [];
  let index = 0;

  while (index < words.length) {
    const chunkWords = words.slice(index, index + chunkSize);
    chunks.push(chunkWords.join(' '));
    
    // Advance index by chunk size minus the overlap
    index += (chunkSize - overlap);
    
    // If the remaining words are less than overlap, we can stop
    if (index >= words.length || words.length - index <= overlap) {
      break;
    }
  }

  return chunks;
}
