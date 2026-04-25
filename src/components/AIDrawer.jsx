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
} from 'react-icons/hi2';
import { FaLinkedinIn } from 'react-icons/fa';
import { fetchAIModels, streamChat, saveSummary } from '../utils/api.js';
import { stripHtml } from '../utils/helpers.js';
import { PERSONAS, TONE_GROUPS, getAISettings, buildSystemPrompt } from '../utils/aiSettings.js';

const PREFERRED_MODELS = ['deepseek-r1', 'deepseek', 'phi4', 'qwen', 'llama'];

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

export default function AIDrawer({ isOpen, onClose, article, extractedContent, feedTitle }) {
  const [tab, setTab] = useState('summary'); // 'summary' | 'chat'
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [modelsError, setModelsError] = useState(null);
  const [showModelPicker, setShowModelPicker] = useState(false);

  // Summary state
  const [summary, setSummary] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const [summaryCopied, setSummaryCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Chat state
  const [messages, setMessages] = useState([]); // [{role, content}]
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const modelPickerRef = useRef(null);
  const abortRef = useRef(null); // tracks whether current stream should stop

  // Load models on mount
  useEffect(() => {
    fetchAIModels()
      .then(({ models: list }) => {
        setModels(list);
        setSelectedModel(pickDefaultModel(list));
      })
      .catch((err) => setModelsError(err.message));
  }, []);

  // Reset when article changes
  useEffect(() => {
    setSummary('');
    setSummaryError(null);
    setSummarizing(false);
    setSaved(false);
    setMessages([]);
    setChatError(null);
    setChatLoading(false);
  }, [article?.id]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when switching to chat tab
  useEffect(() => {
    if (tab === 'chat' && isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [tab, isOpen]);

  // Close model picker on outside click
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

  const generateSummary = useCallback(async () => {
    if (!article || !selectedModel || summarizing) return;
    setSummarizing(true);
    setSummary('');
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

    // Add placeholder for streaming assistant reply
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      for await (const token of streamChat(selectedModel, ollamaMsgs)) {
        if (abortRef.current) break;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: updated[updated.length - 1].content + token,
          };
          return updated;
        });
      }
    } catch (err) {
      setChatError(err.message);
      setMessages((prev) => prev.slice(0, -1)); // remove empty assistant placeholder
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
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      '_blank',
      'width=600,height=600,noopener'
    );
  };

  const shareToTwitter = () => {
    if (!article?.link) return;
    const url = encodeURIComponent(article.link);
    const text = encodeURIComponent(summary ? summary.slice(0, 200) + '…' : article.title || '');
    window.open(
      `https://x.com/intent/tweet?url=${url}&text=${text}`,
      '_blank',
      'width=600,height=400,noopener'
    );
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
    } catch (err) {
      console.error('Failed to save summary:', err);
    } finally {
      setSaving(false);
    }
  }, [summary, saving, article, feedTitle, selectedModel]);

  if (!isOpen) return null;

  const modelLabel = selectedModel
    ? selectedModel.split(':')[0].replace(/-/g, ' ')
    : 'No model';

  // Read current settings for the config badge (re-reads each render when open)
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
          {/* Model picker */}
          <div className="ai-model-picker" ref={modelPickerRef}>
            <button
              className="ai-model-btn"
              onClick={() => setShowModelPicker((s) => !s)}
              disabled={!!modelsError}
              title="Select model"
            >
              {modelsError ? 'Ollama offline' : modelLabel}
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

          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} title="Close AI panel">
            <HiOutlineXMark />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="ai-drawer-tabs">
        <button
          className={`ai-tab ${tab === 'summary' ? 'active' : ''}`}
          onClick={() => setTab('summary')}
        >
          Summary
        </button>
        <button
          className={`ai-tab ${tab === 'chat' ? 'active' : ''}`}
          onClick={() => setTab('chat')}
        >
          Chat
        </button>
      </div>

      {/* Active persona + tone badge strip */}
      <div className="ai-config-strip">
        {activePersonas.map((p) => (
          <span key={p.id} className="ai-config-badge">
            {p.emoji} {p.label}
          </span>
        ))}
        {activeTones.map((t) => (
          <span key={t.id} className="ai-config-badge ai-config-tone-badge">
            {t.label}
          </span>
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
          {!summary && !summarizing && !summaryError && (
            <div className="ai-summary-prompt">
              <p className="ai-summary-hint">
                Generate a concise summary of this article, ready to share.
              </p>
              <button
                className="btn btn-primary ai-generate-btn"
                onClick={generateSummary}
                disabled={!selectedModel || !!modelsError}
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
              <div className="ai-summary-text">
                {summary || <span className="ai-typing-cursor" />}
                {summarizing && <span className="ai-typing-cursor" />}
              </div>

              <div className="ai-summary-actions">
                {summarizing ? (
                  <button className="btn btn-ghost btn-sm" onClick={stopGeneration}>
                    Stop
                  </button>
                ) : (
                  <>
                    <button className="btn btn-ghost btn-sm" onClick={generateSummary} title="Regenerate">
                      <HiOutlineArrowPath /> Regenerate
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={copySummary} title="Copy summary">
                      {summaryCopied ? <HiOutlineCheck style={{ color: 'var(--accent)' }} /> : <HiOutlineClipboardDocument />}
                      {summaryCopied ? 'Copied!' : 'Copy'}
                    </button>
                    <button className="btn btn-ghost btn-sm ai-linkedin-btn" onClick={shareToLinkedIn} title="Share to LinkedIn">
                      <FaLinkedinIn style={{ color: '#0a66c2' }} /> LinkedIn
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={shareToTwitter} title="Share to X / Twitter">
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

      {/* ── Chat Tab ── */}
      {tab === 'chat' && (
        <div className="ai-chat-container">
          <div className="ai-chat-messages">
            {messages.length === 0 && (
              <div className="ai-chat-empty">
                <HiOutlineSparkles />
                <p>Ask anything about this article</p>
                <div className="ai-chat-suggestions">
                  {['What are the key takeaways?', 'Explain this in simple terms', 'What\'s the author\'s main argument?'].map((s) => (
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
                  <div className="ai-message-avatar">
                    <HiOutlineSparkles />
                  </div>
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
              {chatLoading
                ? <HiOutlineXMark />
                : <HiOutlinePaperAirplane />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
