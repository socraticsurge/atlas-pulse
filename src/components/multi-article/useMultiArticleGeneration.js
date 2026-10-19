import { useCallback, useState } from 'react';
import { prepareMultiArticleRequest } from '../../ai/multiArticle.js';
import { getAISettings } from '../../utils/aiSettings.js';
import { streamTokens } from '../../ai/tasks.js';
import { useStreamRun } from '../../hooks/useStreamRun.js';
import { useTokenBuffer } from '../../hooks/useTokenBuffer.js';

/** Generates a Compare / Newsletter / Briefing output with streaming and stop; meta says which model and AI settings made it. */
export function useMultiArticleGeneration() {
  const [output, setOutput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [meta, setMeta] = useState({ model: null, aiSettings: null }); // how the output was made
  const streamRun = useStreamRun();
  const onFlush = useCallback((text) => setOutput((prev) => prev + text), []);
  const tokens = useTokenBuffer(onFlush);

  const reset = useCallback(() => {
    setOutput('');
    setGenerated(false);
    setError(null);
  }, []);

  const run = useCallback(async (request, signal) => {
    const { model, messages, notice: fitNotice } = await prepareMultiArticleRequest(request);
    if (signal.aborted) return;
    setNotice(fitNotice);
    setMeta({ model, aiSettings: getAISettings() });
    const push = (token) => { if (!signal.aborted) tokens.push(token); };
    await streamTokens(model, messages, push, signal);
    tokens.flush();
    setGenerated(true);
  }, [tokens]);

  const generate = useCallback(async (request) => {
    if (generating) return;
    reset();
    setNotice(null);
    setGenerating(true);
    tokens.reset();
    const signal = streamRun.start();
    await run(request, signal).catch((err) => { if (!signal.aborted) setError(err.message); });
    setGenerating(false);
  }, [generating, reset, run, tokens, streamRun]);

  const stop = useCallback(() => streamRun.cancel(), [streamRun]);

  return { output, generating, generated, error, notice, meta, generate, stop, reset };
}
