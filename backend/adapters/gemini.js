/**
 * gemini.js
 * 
 * Swappable LLM adapter for Google Gemini provider.
 * Uses @google/generative-ai.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiAdapter {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    if (!this.apiKey && process.env.LLM_PROVIDER === 'gemini') {
      console.warn('Warning: GEMINI_API_KEY environment variable is not configured.');
    }
    
    // Initialize Gemini SDK
    if (this.apiKey) {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
    }
  }

  /**
   * Completes a chat request grounded in the page content.
   */
  async complete({ systemPrompt, pageContent, history, userQuery }) {
    if (!this.apiKey) {
      // Mock mode for local testing without key
      console.log('[Backend Gemini] API Key missing. Simulating mock Gemini reply...');
      return {
        text: `[GEMINI MOCK] Grounded in page content: "${(pageContent || 'no context').substring(0, 40)}...". Query: "${userQuery}"`,
        isInterpretation: true
      };
    }

    // Format chat prompt with history and content context
    let formattedContext = `${systemPrompt}\n\n`;
    if (pageContent) {
      formattedContext += `Context content of active webpage:\n"""\n${pageContent}\n"""\n\n`;
    }
    
    if (history && history.length > 0) {
      formattedContext += `Conversation History:\n`;
      history.forEach(turn => {
        formattedContext += `${turn.role === 'user' ? 'User' : 'Model'}: ${turn.content}\n`;
      });
      formattedContext += `\n`;
    }

    formattedContext += `User: ${userQuery}\nModel:`;

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(formattedContext);
      const text = result.response.text();
      
      return {
        text,
        isInterpretation: true
      };
    } catch (error) {
      console.error('[Backend Gemini] Completion Error:', error);
      throw error;
    }
  }
}
