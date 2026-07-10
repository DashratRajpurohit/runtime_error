/**
 * openai.js
 * 
 * Swappable LLM adapter for OpenAI provider.
 * Adapted from nanobrowser & page-assist adapter patterns.
 */

import OpenAI from 'openai';

export class OpenAIAdapter {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    if (!this.apiKey && process.env.LLM_PROVIDER === 'openai') {
      console.warn('Warning: OPENAI_API_KEY environment variable is not configured.');
    }
    
    // Initialize OpenAI client
    this.client = new OpenAI({
      apiKey: this.apiKey || 'mock-key-for-development'
    });
  }

  /**
   * Completes a chat request grounded in the page content.
   */
  async complete({ systemPrompt, pageContent, history, userQuery }) {
    if (!this.apiKey) {
      // Mock mode for local testing without key
      console.log('[Backend OpenAI] API Key missing. Simulating mock LLM reply...');
      return {
        text: `[MOCK RESPONSE] You asked about "${(pageContent || 'no context').substring(0, 40)}...". Your query was: "${userQuery}".`,
        isInterpretation: true
      };
    }

    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    if (pageContent) {
      messages.push({ role: 'system', content: `Context content of active webpage:\n"""\n${pageContent}\n"""` });
    }

    // Append history
    if (history) {
      history.forEach(turn => {
        messages.push({ role: turn.role, content: turn.content });
      });
    }

    // Add user query
    messages.push({ role: 'user', content: userQuery });

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.2
      });

      const responseText = response.choices[0]?.message?.content || '';
      return {
        text: responseText,
        isInterpretation: true
      };
    } catch (error) {
      console.error('[Backend OpenAI] Completion Error:', error);
      throw error;
    }
  }
}
