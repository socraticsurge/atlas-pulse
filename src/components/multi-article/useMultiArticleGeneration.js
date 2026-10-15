import { useCallback, useRef, useState } from 'react';
import { prepareMultiArticleRequest } from '../../ai/multiArticle.js';
import { streamTokens } from '../../ai/tasks.js';
import { useTokenBuffer } from '../../hooks/useTokenBuffer.js';

/** Generates a Compare / Newsletter / Briefing output with streaming and stop. */
export function useMultiArticleGeneration() {
  const [output, setOutput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const abortRef = useRef(false);
  const onFlush = useCallback((text) => setOutput((prev) => prev + text), []);
  const tokens = useTokenBuffer(onFlush);

  const reset = useCallback(() => {
    setOutput('');
    setGenerated(false);
    setError(null);
  }, []);

  const run = useCallback(async (request) => {
    const { model, messages, notice: fitNotice } = await prepareMultiArticleRequest(request);
    setNotice(fitNotice);
    await streamTokens(model, messages, tokens.push, () => abortRef.current);
    tokens.flush();
    setGenerated(true);
  }, [tokens]);

  const generate = useCallback(async (request) => {
    if (generating) return;
    reset();
    setNotice(null);
    setGenerating(true);
    abortRef.current = false;
    tokens.reset();
    await run(request).catch((err) => setError(err.message));
    setGenerating(false);
  }, [generating, reset, run, tokens]);

  const stop = useCallback(() => { abortRef.current = true; }, []);

  return { output, generating, generated, error, notice, generate, stop, reset };
}
