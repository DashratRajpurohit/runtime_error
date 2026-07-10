/**
 * agentPlanner.js
 *
 * Prompts and JSON schemas optimized for local 2B parameter LLMs
 * to execute single-step Web RPA actions.
 */

const SYSTEM_PROMPT = `You are a browser automation agent. Your job is to select the next single action to accomplish the user's task based on the current visible page elements.

You are given a list of interactive elements on the page in this format:
- [ID] <type>: "<label>"

You must output a JSON object containing exactly one action:
1. Click an element:
   {"action": "click", "id": <number>}
2. Type into an input/textarea:
   {"action": "type", "id": <number>, "text": "<text to type>"}
3. Scroll the page:
   {"action": "scroll", "direction": "down"|"up"}
4. The user's task is fully completed:
   {"action": "done"}

Rules:
1. Select the single most logical next action.
2. Only select an element ID if it exists in the provided elements list.
3. Do not output any conversational text, explanations, or notes.
4. Output valid JSON only.`;

/**
 * Builds the prompt for the agent planner.
 * @param {string} userTask The goal of the user (e.g. "Search for Llama 3")
 * @param {Array} elements The list of parsed interactive elements
 * @param {Array} history Optional history of past executed steps
 */
function buildAgentPrompt(userTask, elements, history = []) {
  let elementListText = elements.map(el => `- [${el.id}] ${el.type}: "${el.label}"`).join('\n');
  if (elements.length === 0) {
    elementListText = "(No interactive elements found on the visible viewport)";
  }

  let historyText = '';
  if (history.length > 0) {
    historyText = "\n\nPast executed steps:\n" + history.map((h, i) => `${i + 1}. Action: ${h.action}, ID: ${h.id || 'N/A'}, Text: ${h.text || 'N/A'}`).join('\n');
  }

  return {
    system: SYSTEM_PROMPT,
    prompt: `User Task: "${userTask}"${historyText}\n\nVisible Page Elements:\n${elementListText}\n\nSelect the next single action JSON:`
  };
}

export {
  buildAgentPrompt
};
