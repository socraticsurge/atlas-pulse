import { useState, useEffect, useRef, useCallback } from 'react';
import {
  HiOutlineSparkles,
  HiOutlineXMark,
  HiOutlineClipboardDocument,
  HiOutlineCheck,
  HiOutlinePaperAirplane,
  HiOutlineArrowPath,
  HiOutlineExclamationCircle,
  HiOutlineChevronDown,
  HiOutlineBookmarkSquare,
  HiOutlineBeaker,
  HiOutlineTrash,
  HiOutlinePencilSquare,
} from 'react-icons/hi2';
import { FaLinkedinIn } from 'react-icons/fa';
import { fetchAIModels, streamChat, saveSummary, patchArticle } from '../utils/api.js';
import { stripHtml } from '../utils/helpers.js';
import { PERSONAS, TONE_GROUPS, getAISettings, buildSystemPrompt } from '../utils/aiSettings.js';
import OllamaSetup from './OllamaSetup.jsx';
import { HIGHLIGHT_COLORS } from '../utils/constants.js';

const PREFERRED_MODELS = ['deepseek-r1', 'deepseek', 'phi4', 'qwen', 'llama'];
const MAX_CHAT_MESSAGES = 40; // ~20 exchanges

function pickDefaultModel(models) {
  for (const pref of PREFERRED_MODELS) {
    const found = models.find((m) => m.name.toLowerCase().includes(pref));
    if (found) return found.name;
  }
  return models[0]?.name || '';
}

function buildArticleContext(article, extractedContent) {
  const content = stripHtml(extractedContent || article?.content || article?.summary || '');
  const truncated = content.length > 6000 ? content.slice(0, 6000) + '…' : content;
  return `Title: ${article?.title || 'Unknown'}
Author: ${article?.author || 'Unknown'}
Published: ${article?.publishedAt ? new Date(article.publishedAt).toDateString() : 'Unknown'}

${truncated}`;
}

const BASE_SUMMARY = `You are an editorial reading assistant. Read the article and write a concise, insightful summary in 3–4 sentences. Focus on the key finding or argument, why it matters, and one concrete takeaway. Write in plain prose, no bullet points. Do not start with "This article".`;

const BASE_CHAT = `You are a reading assistant. Answer questions about the article clearly and concisely. Stay grounded in the article content. If something is not covered in the article, say so briefly.`;

const ANALYSIS_PROMPT = `Analyze the article and respond with ONLY a valid JSON object — no markdown, no explanation, no code blocks. Use exactly these fields:
{
  "sentiment": "positive|neutral|negative",
  "urgency": "breaking|developing|evergreen",
  "frame": "conflict|human_interest|economic|analytical",
  "tone": "alarming|analytical|optimistic|opinion",
  "depth": "brief|standard|deep_dive",
  "topics": ["tag1", "tag2", "tag3"]
}`;

const ANALYSIS_DIMS = [
  { key: 'sentiment', label: 'Sentiment', values: { positive: '😊 Positive', neutral: '😐 Neutral', negative: '😟 Negative' } },
  { key: 'urgency',   label: 'Urgency',   values: { breaking: '🔴 Breaking', developing: '🟡 Developing', evergreen: '🟢 Evergreen' } },
  { key: 'frame',     label: 'Frame',     values: { conflict: '⚔️ Conflict', human_interest: '👤 Human Interest', economic: '📊 Economic', analytical: '🔬 Analytical' } },
  { key: 'tone',      label: 'Tone',      values: { alarming: '🚨 Alarming', analytical: '💡 Analytical', optimistic: '✨ Optimistic', opinion: '💭 Opinion' } },
  { key: 'depth',     label: 'Depth',     values: { brief: '⚡ Brief', standard: '📄 Standard', deep_dive: '📚 Deep Dive' } },
];

function parseAnalysisJSON(raw) {
  // Strip markdown code fences (models sometimes wrap JSON in ```json ... ```)
  const stripped = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '');
  // Collect all balanced {} blocks using bracket depth tracking
  const candidates = [];
  let depth = 0, start = -1;
  for (let i = 0; i < stripped.length; i++) {
    if (stripped[i] === '{') { if (depth === 0) start = i; depth++; }
    else if (stripped[i] === '}') { depth--; if (depth === 0 && start !== -1) { candidates.push(stripped.slice(start, i + 1)); start = -1; } }
  }
  // Try from last to first — reasoning models often output reasoning prose then JSON at the end
  for (let i = candidates.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(candidates[i]);
      if (parsed.sentiment || parsed.urgency || parsed.frame) {
        return {
          sentiment: parsed.sentiment || 'neutral',
          urgency:   parsed.urgency   || 'evergreen',
          frame:     parsed.frame     || 'analytical',
          tone:      parsed.tone      || 'analytical',
          depth:     parsed.depth     || 'standard',
          topics:    Array.isArray(parsed.topics) ? parsed.topics.slice(0, 5) : [],
        };
      }
    } catch { /* try next candidate */ }
  }
  throw new Error('Could not extract valid analysis from model response');
}

// Grouped analysis display — shown inside the Summary tab
function AnalysisPanel({ analysis, analyzing, error, onRun, canRun }) {
  if (analyzing) {
    return (
      <div className="analysis-panel">
        <div className="analysis-panel-header">
          <span className="analysis-panel-title"><HiOutlineBeaker /> Content Analysis</span>
        </div>
        <div className="analysis-loading">
          <span className="spinner" style={{ width: 14, height: 14 }} />
          <span>Analyzing…</span>
        </div>
      </div>
    );
  }

  if (!analysis && !error) {
    return (
      <div className="analysis-panel analysis-panel-empty">
        <div className="analysis-empty-body">
          <HiOutlineBeaker className="analysis-empty-icon" />
          <div>
            <p className="analysis-empty-label">Content Analysis</p>
            <p className="analysis-empty-hint">Classify sentiment, urgency, framing, and tone</p>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={onRun}
            disabled={!canRun}
          >
            Analyze
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analysis-panel">
        <div className="analysis-panel-header">
          <span className="analysis-panel-title"><HiOutlineBeaker /> Content Analysis</span>
          <button className="btn btn-ghost btn-sm" onClick={onRun} disabled={!canRun}>
            <HiOutlineArrowPath /> Retry
          </button>
        </div>
        <div className="ai-error" style={{ margin: 0 }}>
          <HiOutlineExclamationCircle />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="analysis-panel">
      <div className="analysis-panel-header">
        <span className="analysis-panel-title"><HiOutlineBeaker /> Content Analysis</span>
        <button className="btn btn-ghost btn-sm" onClick={onRun} disabled={!canRun} title="Re-analyze">
          <HiOutlineArrowPath />
        </button>
      </div>
      <div className="analysis-grid">
        {ANALYSIS_DIMS.map(({ key, label, values }) => {
          const val = analysis[key];
          const display = val ? (values[val] || val) : null;
          return (
            <div key={key} className="analysis-row">
              <span className="analysis-dim-label">{label}</span>
              {display
                ? <span className={`analysis-value-badge analysis-badge-${key}-${val}`}>{display}</span>
                : <span className="analysis-no-value">—</span>
              }
            </div>
          );
        })}
        {analysis.topics?.length > 0 && (
          <div className="analysis-row analysis-row-topics">
            <span className="analysis-dim-label">Topics</span>
            <div className="analysis-topics">
              {analysis.topics.map((t) => (
                <span key={t} className="analysis-topic-tag">#{t}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AIDrawer({ isOpen, onClose, article, extractedContent, feedTitle, onSummarySaved, highlights: articleHighlights = [], onHighlightDeleted }) {
  const [tab, setTab] = useState('summary');
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [ollamaReady, setOllamaReady] = useState(false);
  const [ollamaChecked, setOllamaChecked] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);

  // Summary state
  const [summary, setSummary] = useState('');
  const [isBatchSummary, setIsBatchSummary] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const [summaryCopied, setSummaryCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Analysis state
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const modelPickerRef = useRef(null);
  const abortRef = useRef(null);
  const tokenBufferRef = useRef('');
  const rafRef = useRef(null);

  const loadModels = useCallback((modelList) => {
    setModels(modelList);
    setSelectedModel(prev => prev || pickDefaultModel(modelList));
    setOllamaReady(modelList.length > 0);
    setOllamaChecked(true);
  }, []);

  // Initial model check — set ollamaChecked regardless of outcome to avoid flash
  useEffect(() => {
    fetchAIModels()
      .then(({ models: list }) => loadModels(list))
      .catch(() => { setOllamaReady(false); setOllamaChecked(true); });
  }, [loadModels]);

  // Reset all state when the article changes, and pick up batch AI results as
  // they land — done during render (not in effects) so the reset and the new
  // article's first paint happen in one pass.
  const parseBatchAnalysis = (raw) => {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  };

  const [prevArticleId, setPrevArticleId] = useState(article?.id);
  const [prevAiSummary, setPrevAiSummary] = useState(article?.aiSummary);
  const [prevAiAnalysis, setPrevAiAnalysis] = useState(article?.aiAnalysis);
  if (prevArticleId !== article?.id) {
    setPrevArticleId(article?.id);
    setPrevAiSummary(article?.aiSummary);
    setPrevAiAnalysis(article?.aiAnalysis);
    setSummary(article?.aiSummary || '');
    setIsBatchSummary(Boolean(article?.aiSummary));
    setSummaryError(null);
    setSummarizing(false);
    setSaved(false);
    setMessages([]);
    setChatError(null);
    setChatLoading(false);
    setAnalysis(parseBatchAnalysis(article?.aiAnalysis));
    setAnalysisError(null);
  } else {
    // Same article, new batch results (e.g. background processing finished)
    if (prevAiSummary !== article?.aiSummary) {
      setPrevAiSummary(article?.aiSummary);
      if (article?.aiSummary) {
        setSummary(article.aiSummary);
        setIsBatchSummary(true);
      }
    }
    if (prevAiAnalysis !== article?.aiAnalysis) {
      setPrevAiAnalysis(article?.aiAnalysis);
      const parsed = parseBatchAnalysis(article?.aiAnalysis);
      if (parsed) setAnalysis(parsed);
    }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (tab === 'chat' && isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [tab, isOpen]);

  useEffect(() => {
    if (!showModelPicker) return;
    const handler = (e) => {
      if (modelPickerRef.current && !modelPickerRef.current.contains(e.target)) {
        setShowModelPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showModelPicker]);

  const runAnalysis = useCallback(async () => {
    if (!article || !selectedModel || analyzing) return;
    setAnalyzing(true);
    setAnalysisError(null);
    abortRef.current = false;

    const rawText = stripHtml(extractedContent || article.content || article.summary || '');
    const text = rawText.length > 4000 ? rawText.slice(0, 4000) + '…' : rawText;
    const msgs = [
      { role: 'system', content: ANALYSIS_PROMPT },
      { role: 'user', content: `Title: ${article.title}\n\n${text}` },
    ];

    try {
      let response = '';
      for await (const token of streamChat(selectedModel, msgs)) {
        if (abortRef.current) break;
        response += token;
      }
      const parsed = parseAnalysisJSON(response);
      setAnalysis(parsed);
      await patchArticle(article.id, { aiAnalysis: JSON.stringify(parsed) }).catch(() => {});
    } catch (err) {
      setAnalysisError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }, [article, extractedContent, selectedModel, analyzing]);

  const generateSummary = useCallback(async () => {
    if (!article || !selectedModel || summarizing) return;
    setSummarizing(true);
    setSummary('');
    setIsBatchSummary(false);
    setSummaryError(null);
    abortRef.current = false;

    const settings = getAISettings();
    const systemPrompt = buildSystemPrompt(BASE_SUMMARY, settings);
    const articleContext = buildArticleContext(article, extractedContent);
    const msgs = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: articleContext },
    ];

    try {
      for await (const token of streamChat(selectedModel, msgs)) {
        if (abortRef.current) break;
        setSummary((prev) => prev + token);
      }
    } catch (err) {
      setSummaryError(err.message);
    } finally {
      setSummarizing(false);
    }
  }, [article, extractedContent, selectedModel, summarizing]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || !selectedModel || chatLoading) return;

    const userMsg = { role: 'user', content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setChatLoading(true);
    setChatError(null);
    abortRef.current = false;

    const settings = getAISettings();
    const systemPrompt = buildSystemPrompt(BASE_CHAT, settings);
    const articleContext = buildArticleContext(article, extractedContent);
    const systemMsg = { role: 'system', content: `${systemPrompt}\n\nARTICLE:\n${articleContext}` };
    const ollamaMsgs = [systemMsg, ...nextMessages];

    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
    tokenBufferRef.current = '';
    rafRef.current = null;

    const flushTokens = () => {
      const buffered = tokenBufferRef.current;
      tokenBufferRef.current = '';
      rafRef.current = null;
      if (!buffered) return;
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: updated[updated.length - 1].content + buffered,
        };
        return updated.length > MAX_CHAT_MESSAGES ? updated.slice(-MAX_CHAT_MESSAGES) : updated;
      });
    };

    try {
      for await (const token of streamChat(selectedModel, ollamaMsgs)) {
        if (abortRef.current) break;
        tokenBufferRef.current += token;
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(flushTokens);
        }
      }
      // Flush any remaining tokens after stream ends
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      flushTokens();
    } catch (err) {
      setChatError(err.message);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setChatLoading(false);
    }
  }, [input, messages, selectedModel, article, extractedContent, chatLoading]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const stopGeneration = () => {
    abortRef.current = true;
    setSummarizing(false);
    setChatLoading(false);
    setAnalyzing(false);
  };

  const copySummary = () => {
    if (!summary) return;
    const text = `${summary}\n\nRead more: ${article?.link || ''}`;
    navigator.clipboard.writeText(text).then(() => {
      setSummaryCopied(true);
      setTimeout(() => setSummaryCopied(false), 2000);
    });
  };

  const shareToLinkedIn = () => {
    if (!article?.link) return;
    const url = encodeURIComponent(article.link);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank', 'width=600,height=600,noopener');
  };

  const shareToTwitter = () => {
    if (!article?.link) return;
    const url = encodeURIComponent(article.link);
    const text = encodeURIComponent(summary ? summary.slice(0, 200) + '…' : article.title || '');
    window.open(`https://x.com/intent/tweet?url=${url}&text=${text}`, '_blank', 'width=600,height=400,noopener');
  };

  const handleSaveSummary = useCallback(async () => {
    if (!summary || saving) return;
    setSaving(true);
    const settings = getAISettings();
    try {
      await saveSummary({
        article_title: article?.title || null,
        article_url: article?.link || null,
        article_author: article?.author || null,
        article_source: feedTitle || null,
        article_published_at: article?.publishedAt || null,
        summary_text: summary,
        ai_model: selectedModel,
        ai_personas: settings.personas,
        ai_tone_voice: settings.tone?.voice || null,
        ai_tone_energy: settings.tone?.energy || null,
        ai_tone_angle: settings.tone?.angle || null,
        ai_custom_instructions: settings.customInstructions || null,
      });
      setSaved(true);
      onSummarySaved?.();
    } catch (err) {
      console.error('Failed to save summary:', err);
    } finally {
      setSaving(false);
    }
  }, [summary, saving, article, feedTitle, selectedModel, onSummarySaved]);

  if (!isOpen) return null;

  const modelLabel = selectedModel
    ? selectedModel.split(':')[0].replace(/-/g, ' ')
    : 'No model';

  const activeSettings = getAISettings();
  const activePersonas = PERSONAS.filter((p) => activeSettings.personas.includes(p.id));
  const activeTones = TONE_GROUPS.map((group) => {
    const selectedId = activeSettings.tone[group.id] || group.tones[0].id;
    return group.tones.find((t) => t.id === selectedId) || group.tones[0];
  });

  return (
    <div className="ai-drawer">
      {/* Header */}
      <div className="ai-drawer-header">
        <div className="ai-drawer-title">
          <HiOutlineSparkles className="ai-sparkle-icon" />
          <span>AI Assistant</span>
        </div>

        <div className="ai-drawer-header-right">
          {/* Inline loading indicator while doing initial model check */}
          {!ollamaChecked && (
            <span className="ai-checking-label">
              <span className="spinner" style={{ width: 11, height: 11 }} /> checking
            </span>
          )}

          {ollamaReady && (
            <div className="ai-model-picker" ref={modelPickerRef}>
              <button
                className="ai-model-btn"
                onClick={() => setShowModelPicker((s) => !s)}
                title="Select model"
              >
                {modelLabel}
                <HiOutlineChevronDown className={showModelPicker ? 'rotated' : ''} />
              </button>
              {showModelPicker && models.length > 0 && (
                <div className="ai-model-dropdown">
                  {models.map((m) => (
                    <button
                      key={m.name}
                      className={`ai-model-option ${m.name === selectedModel ? 'active' : ''}`}
                      onClick={() => { setSelectedModel(m.name); setShowModelPicker(false); }}
                    >
                      <span className="ai-model-option-name">{m.name.split(':')[0]}</span>
                      <span className="ai-model-option-meta">{m.parameterSize}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} title="Close AI panel">
            <HiOutlineXMark />
          </button>
        </div>
      </div>

      {/* Ollama setup — only after check confirms it's NOT ready */}
      {ollamaChecked && !ollamaReady && (
        <div className="ai-drawer-setup">
          <OllamaSetup compact onReady={loadModels} />
        </div>
      )}

      {/* Main content — only when Ollama is ready */}
      {ollamaReady && (
        <>
          {/* Tab bar */}
          <div className="ai-drawer-tabs">
            <button className={`ai-tab ${tab === 'summary' ? 'active' : ''}`} onClick={() => setTab('summary')}>
              Summary
            </button>
            <button className={`ai-tab ${tab === 'analysis' ? 'active' : ''}`} onClick={() => setTab('analysis')}>
              Analysis
            </button>
            <button className={`ai-tab ${tab === 'chat' ? 'active' : ''}`} onClick={() => setTab('chat')}>
              Chat
            </button>
            <button className={`ai-tab ${tab === 'highlights' ? 'active' : ''}`} onClick={() => setTab('highlights')}>
              Highlights {articleHighlights.length > 0 && <span className="ai-tab-badge">{articleHighlights.length}</span>}
            </button>
          </div>

          {/* Active persona + tone badge strip */}
          <div className="ai-config-strip">
            {activePersonas.map((p) => (
              <span key={p.id} className="ai-config-badge">{p.emoji} {p.label}</span>
            ))}
            {activeTones.map((t) => (
              <span key={t.id} className="ai-config-badge ai-config-tone-badge">{t.label}</span>
            ))}
            {activeSettings.customInstructions.trim() && (
              <span className="ai-config-badge ai-config-custom-badge" title={activeSettings.customInstructions}>
                + Custom
              </span>
            )}
          </div>

          {/* ── Summary Tab ── */}
          {tab === 'summary' && (
            <div className="ai-drawer-body">

              {!summary && !summarizing && !summaryError && article?.aiStatus === 'queued' && (
                <div className="ai-batch-pending">
                  <span className="spinner" style={{ width: 14, height: 14 }} />
                  <span>Summary queued — will appear here shortly</span>
                </div>
              )}

              {!summary && !summarizing && !summaryError && article?.aiStatus !== 'queued' && (
                <div className="ai-summary-prompt">
                  <p className="ai-summary-hint">Generate a concise summary, ready to share.</p>
                  <button
                    className="btn btn-primary ai-generate-btn"
                    onClick={generateSummary}
                    disabled={!selectedModel || analyzing}
                  >
                    <HiOutlineSparkles /> Generate Summary
                  </button>
                </div>
              )}

              {summaryError && (
                <div className="ai-error">
                  <HiOutlineExclamationCircle />
                  <span>{summaryError}</span>
                  <button className="btn btn-ghost btn-sm" onClick={generateSummary}>Retry</button>
                </div>
              )}

              {(summary || summarizing) && (
                <div className="ai-summary-result">
                  {isBatchSummary && (
                    <div className="ai-batch-label">Batch summary · <span onClick={generateSummary}>regenerate for custom persona</span></div>
                  )}

                  <div className="ai-summary-text">
                    {summary || <span className="ai-typing-cursor" />}
                    {summarizing && <span className="ai-typing-cursor" />}
                  </div>

                  <div className="ai-summary-actions">
                    {summarizing ? (
                      <button className="btn btn-ghost btn-sm" onClick={stopGeneration}>Stop</button>
                    ) : (
                      <>
                        <button className="btn btn-ghost btn-sm" onClick={generateSummary} title="Regenerate">
                          <HiOutlineArrowPath /> Regenerate
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={copySummary} title="Copy summary">
                          {summaryCopied ? <HiOutlineCheck style={{ color: 'var(--accent)' }} /> : <HiOutlineClipboardDocument />}
                          {summaryCopied ? 'Copied!' : 'Copy'}
                        </button>
                        <button className="btn btn-ghost btn-sm ai-linkedin-btn" onClick={shareToLinkedIn}>
                          <FaLinkedinIn style={{ color: '#0a66c2' }} /> LinkedIn
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={shareToTwitter}>
                          Share on X
                        </button>
                        <div className="ai-summary-actions-divider" />
                        <button
                          className={`btn btn-sm ${saved ? 'btn-ghost' : 'btn-primary'} ai-save-btn`}
                          onClick={handleSaveSummary}
                          disabled={saving || saved}
                          title={saved ? 'Saved to library' : 'Save to Summaries library'}
                        >
                          {saving ? (
                            <span className="spinner" style={{ width: 12, height: 12 }} />
                          ) : saved ? (
                            <HiOutlineCheck style={{ color: 'var(--accent)' }} />
                          ) : (
                            <HiOutlineBookmarkSquare />
                          )}
                          {saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Analysis Tab ── */}
          {tab === 'analysis' && (
            <div className="ai-drawer-body">
              <AnalysisPanel
                analysis={analysis}
                analyzing={analyzing}
                error={analysisError}
                onRun={runAnalysis}
                canRun={!!selectedModel && !summarizing}
              />
            </div>
          )}

          {/* ── Chat Tab ── */}
          {tab === 'chat' && (
            <div className="ai-chat-container">
              <div className="ai-chat-messages">
                {messages.length === 0 && (
                  <div className="ai-chat-empty">
                    <HiOutlineSparkles />
                    <p>Ask anything about this article</p>
                    <div className="ai-chat-suggestions">
                      {['What are the key takeaways?', 'Explain this in simple terms', "What's the author's main argument?"].map((s) => (
                        <button
                          key={s}
                          className="ai-suggestion-chip"
                          onClick={() => { setInput(s); inputRef.current?.focus(); }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} className={`ai-message ai-message-${msg.role}`}>
                    {msg.role === 'assistant' && (
                      <div className="ai-message-avatar"><HiOutlineSparkles /></div>
                    )}
                    <div className="ai-message-bubble">
                      {msg.content || (chatLoading && i === messages.length - 1
                        ? <span className="ai-typing-cursor" />
                        : null)}
                    </div>
                  </div>
                ))}

                {chatError && (
                  <div className="ai-error">
                    <HiOutlineExclamationCircle />
                    <span>{chatError}</span>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              <div className="ai-chat-input-row">
                <textarea
                  ref={inputRef}
                  className="ai-chat-input"
                  placeholder="Ask about this article…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  disabled={chatLoading}
                />
                <button
                  className="btn btn-primary ai-send-btn"
                  onClick={chatLoading ? stopGeneration : sendMessage}
                  disabled={!chatLoading && !input.trim()}
                  title={chatLoading ? 'Stop' : 'Send'}
                >
                  {chatLoading ? <HiOutlineXMark /> : <HiOutlinePaperAirplane />}
                </button>
              </div>
            </div>
          )}

          {/* ── Highlights Tab ── */}
          {tab === 'highlights' && (
            <div className="ai-drawer-body highlights-tab">
              {articleHighlights.length === 0 ? (
                <div className="ai-empty-state">
                  <HiOutlinePencilSquare />
                  <p>No highlights for this article yet. Select any text to save it.</p>
                </div>
              ) : (
                <div className="highlights-tab-list">
                  {articleHighlights.map(h => (
                    <div key={h.id} className="highlight-tab-item">
                      <div
                        className="highlight-tab-bar"
                        style={{ background: HIGHLIGHT_COLORS[h.color] || HIGHLIGHT_COLORS.yellow }}
                      />
                      <div className="highlight-tab-content">
                        <p className="highlight-tab-text">"{h.highlighted_text}"</p>
                        {h.note && <p className="highlight-tab-note">{h.note}</p>}
                      </div>
                      <button
                        className="btn btn-ghost btn-icon btn-sm highlight-tab-delete"
                        onClick={() => onHighlightDeleted?.(h.id)}
                        title="Delete"
                      >
                        <HiOutlineTrash />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
