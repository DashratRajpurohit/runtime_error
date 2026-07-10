/**
 * background.js
 * 
 * Extension service worker. Manages application states, routes messages
 * between UI, content scripts, and backend services.
 */

import { MessageActions } from '../shared/messageSchema.js';

const BACKEND_URL = 'http://localhost:4000';

chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Browser Companion Service Worker Installed.');
});

// Listener for extension icon action clicks
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_FLOATING_PANEL' }, (res) => {
    if (chrome.runtime.lastError) {
      console.log('Error sending message:', chrome.runtime.lastError.message);
      // Fallback: inject content script if not already present
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/Readability.js', 'content/content.js']
      }).then(() => {
        setTimeout(() => {
          chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_FLOATING_PANEL' });
        }, 100);
      }).catch(err => {
        console.error('Failed to inject content script:', err);
      });
    }
  });
});

let activeQueryAbortController = null;

// Listener for messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] Received message:', message);

  switch (message.action) {
    case 'TRIGGER_EXTRACTION':
      // Forward the extraction trigger to the active tab's content script
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        if (!tabs[0]) {
          sendResponse({ status: 'error', message: 'No active tab found' });
          return;
        }
        chrome.tabs.sendMessage(tabs[0].id, { action: 'TRIGGER_EXTRACTION' }, (response) => {
          if (chrome.runtime.lastError) {
            sendResponse({ status: 'error', message: chrome.runtime.lastError.message });
          } else {
            sendResponse(response);
          }
        });
      });
      return true; // async response

    case 'USER_QUERY':
      handleUserQuery(message.payload)
        .then(response => sendResponse({ status: 'success', data: response }))
        .catch(err => sendResponse({ status: 'error', message: err.message }));
      return true; // async response

    case 'ABORT_QUERY':
      if (activeQueryAbortController) {
        activeQueryAbortController.abort();
        activeQueryAbortController = null;
        console.log('[Background] Active query aborted by user request.');
        sendResponse({ status: 'success' });
      } else {
        sendResponse({ status: 'ignored' });
      }
      return true;

    default:
      console.warn('[Background] Unknown action:', message.action);
      sendResponse({ status: 'error', message: `Unknown action: ${message.action}` });
      break;
  }
});

/**
 * Sends the query request to the backend API.
 * Routes to /api/summarize if the intent is SUMMARIZE.
 */
async function handleUserQuery(payload) {
  if (activeQueryAbortController) {
    activeQueryAbortController.abort();
  }
  activeQueryAbortController = new AbortController();
  const signal = activeQueryAbortController.signal;

  const isSummarize = payload.intent === 'SUMMARIZE';
  const endpoint = isSummarize ? `${BACKEND_URL}/api/summarize` : `${BACKEND_URL}/api/query`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: signal
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } finally {
    if (activeQueryAbortController?.signal === signal) {
      activeQueryAbortController = null;
    }
  }
}

// Tab update listener to resume agent automation on page navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
    chrome.storage.local.get(['agentActiveTask'], (result) => {
      if (result.agentActiveTask) {
        console.log('[Background] Active agent task detected on page load. Auto-injecting and opening panel.');
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content/Readability.js', 'content/content.js']
        }).then(() => {
          setTimeout(() => {
            chrome.tabs.sendMessage(tabId, { action: 'OPEN_FLOATING_PANEL' });
          }, 150);
        }).catch(err => {
          console.warn('[Background] Failed to auto-inject content script on updated tab:', err);
        });
      }
    });
  }
});
