// Calculate estimated reading time based on content
export function calculateReadTime(content: string, title?: string): number {
  const wordsPerMinute = 200; // Average reading speed
  
  // Combine title and content for calculation
  const fullText = `${title || ''} ${content}`;
  
  // Count words (split by whitespace and filter empty strings)
  const wordCount = fullText.trim().split(/\s+/).filter(word => word.length > 0).length;
  
  // Calculate minutes, minimum 1 minute
  const minutes = Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  
  return minutes;
}