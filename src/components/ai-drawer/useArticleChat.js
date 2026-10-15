import { useCallback, useRef, useState } from 'react';
import { getAISettings } from '../../utils/aiSettings.js';
import { chatMessages, streamTokens } from '../../ai/tasks.js';
import { useTokenBuffer } from '../../hooks/useTokenBuffer.js';

const MAX_CHAT_MESSAGES = 40; // ~20 exchanges

// Appends streamed text to the last (assistant) message, capping history.
const appendToLast = (text) => (prev) => {
  const updated = [...prev];
  const last = updated[updated.length - 1];
  updated[updated.length - 1] = { role: 'assistant', content: last.content + text };
  return updated.length > MAX_CHAT_MESSAGES ? updated.slice(-MAX_CHAT_MESSAGES) : updated;
};

/** Chat tab state: conversation about the current article. */
export function useArticleChat({ article, extractedContent, model }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(false);
  const onFlush = useCallback((text) => setMessages(appendToLast(text)), []);
  const tokens = useTokenBuffer(onFlush);

  // Reset the conversation when the article changes.
  const [prevId, setPrevId] = useState(article?.id);
  if (prevId !== article?.id) {
    setPrevId(article?.id);
    setMessages([]);
    setError(null);
    setLoading(false);
  }

  const fail = useCallback((err) => {
    setError(err.message);
    setMessages((prev) => prev.slice(0, -1));
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (loading) return;
    if (!text || !model) return;
    const history = [...messages, { role: 'user', content: text }];
    setMessages([...history, { role: 'assistant', content: '' }]);
    setInput('');
    setLoading(true);
    setError(null);
    abortRef.current = false;
    tokens.reset();
    const prompt = chatMessages(article, extractedContent, getAISettings(), history);
    await streamTokens(model, prompt, tokens.push, () => abortRef.current).then(tokens.flush, fail);
    setLoading(false);
  }, [input, messages, model, loading, article, extractedContent, tokens, fail]);

  const stop = useCallback(() => {
    abortRef.current = true;
    setLoading(false);
  }, []);

  return { messages, input, setInput, loading, error, send, stop };
}
