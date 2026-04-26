import { useState, useRef, useCallback, useEffect } from 'react';
import {
  HiOutlineXMark,
  HiOutlineSparkles,
  HiOutlineClipboardDocument,
  HiOutlineCheck,
  HiOutlineArrowDownTray,
  HiOutlineEnvelope,
  HiOutlineExclamationCircle,
  HiOutlineArrowPath,
} from 'react-icons/hi2';
import { streamChat } from '../utils/api.js';
import { stripHtml } from '../utils/helpers.js';
import { downloadAsDocx, downloadAsMarkdown } from '../utils/docx.js';
import { getBatchSettings } from '../utils/batchSettings.js';
import { getAISettings, buildSystemPrompt } from '../utils/aiSettings.js';
import ResizableHandle from './ResizableHandle.jsx';

const OPERATIONS = {
  compare:    { label: 'Compare',    min: 2, max: 5,  hint: '2–5 articles' },
  newsletter: { label: 'Newsletter', min: 3, max: 15, hint: '3–15 articles' },
  briefing:   { label: 'Briefing',   min: 2, max: 15, hint: '2–15 articles' },
};

const NEWSLETTER_TEMPLATES = [
  { id: 'digest',   label: 'Daily Digest' },
  { id: 'roundup',  label: 'Weekly Roundup' },
  { id: 'brief',    label: 'Executive Brief' },
];

function buildArticleContext(articles) {
  return articles.map((a, i) => {
    const content = stripHtml(a.content || a.summary || '').slice(0, 1200);
    const date = a.publishedAt ? new Date(a.publishedAt).toDateString() : 'Unknown';
    return `=== ARTICLE ${i + 1} ===\nTitle: ${a.title || 'Untitled'}\nSource: ${a.feedTitle || 'Unknown'}\nPublished: ${date}\nURL: ${a.link || ''}\n\n${content}`;
  }).join('\n\n');
}

function buildMessages(operation, template, instructions, articles) {
  const articleContext = buildArticleContext(articles);
  const aiSettings = getAISettings();
  let basePrompt = '';
  let userMessage = '';

  if (operation === 'compare') {
    basePrompt = `You are a media analyst comparing how different sources cover the same topic.\n\nFor each dimension below, show how each article approaches it — reference the source by name:\n\n1. **Angle & Framing** — What perspective does each source emphasize?\n2. **Key Claims** — What are the main factual claims?\n3. **What's Missing** — What does each source omit or downplay?\n4. **Tone** — How does the language differ?\n5. **Evidence** — What sources or data does each cite?\n\nUse markdown with clear headers. Be specific and grounded in the text.`;
    userMessage = `${articleContext}\n\n---\nCompare these ${articles.length} articles across the dimensions above.${instructions ? `\n\nAdditional focus: ${instructions}` : ''}`;
  } else if (operation === 'newsletter') {
    const templateInstructions = {
      digest:   'Write a concise daily digest. Keep summaries to 2-3 sentences each. Informative tone. One-line intro and brief closing.',
      roundup:  'Write a weekly roundup. Include more context and commentary. Group related stories if applicable. Conversational yet professional.',
      brief:    'Write an executive briefing. Lead with the most critical stories. Use bullet points for key takeaways. Be direct; focus on strategic implications.',
    };
    basePrompt = `You are a professional newsletter writer creating a curated digest.\n\n${templateInstructions[template] || templateInstructions.digest}\n\nFormat with clear markdown headers (## for section titles), bullet points for takeaways, and attribution for each story.`;
    userMessage = `${articleContext}\n\n---\nWrite the newsletter from these ${articles.length} articles.${instructions ? `\n\nAdditional instructions: ${instructions}` : ''}`;
  } else {
    basePrompt = `You are an expert analyst. Answer the user's question using only information from the provided articles. Be precise. Cite which article supports each point by source name.`;
    userMessage = `${articleContext}\n\n---\n${instructions || 'Summarize the key themes across these articles.'}`;
  }

  return [
    { role: 'system', content: buildSystemPrompt(basePrompt, aiSettings) },
    { role: 'user',   content: userMessage },
  ];
}

export default function MultiArticlePanel({ articles: initialArticles, initialOperation, onClose, width, onResize }) {
  const [operation, setOperation] = useState(initialOperation || 'briefing');
  const [chips, setChips] = useState(() => initialArticles.map(a => a.id));
  const [template, setTemplate] = useState('digest');
  const [instructions, setInstructions] = useState('');
  const [output, setOutput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const abortRef = useRef(false);
  const tokenBufferRef = useRef('');
  const rafRef = useRef(null);
  const outputEndRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => { requestAnimationFrame(() => setIsVisible(true)); }, []);

  const activeArticles = initialArticles.filter(a => chips.includes(a.id));
  const op = OPERATIONS[operation];
  const countOk = activeArticles.length >= op.min && activeArticles.length <= op.max;

  const removeChip = (id) => setChips(prev => prev.filter(x => x !== id));

  const generate = useCallback(async () => {
    if (!countOk || generating) return;
    setOutput('');
    setError(null);
    setGenerated(false);
    setGenerating(true);
    abortRef.current = false;
    tokenBufferRef.current = '';
    rafRef.current = null;

    const messages = buildMessages(operation, template, instructions, activeArticles);
    const model = getBatchSettings().model || '';

    if (!model) { setError('No AI model selected. Configure one in Settings → AI Processing.'); setGenerating(false); return; }

    const flushTokens = () => {
      const buffered = tokenBufferRef.current;
      tokenBufferRef.current = '';
      rafRef.current = null;
      if (buffered) setOutput(prev => prev + buffered);
    };

    try {
      for await (const token of streamChat(model, messages)) {
        if (abortRef.current) break;
        tokenBufferRef.current += token;
        if (!rafRef.current) rafRef.current = requestAnimationFrame(flushTokens);
      }
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      flushTokens();
      setGenerated(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }, [countOk, generating, operation, template, instructions, activeArticles]);

  const stop = () => { abortRef.current = true; };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadDocx = () => {
    downloadAsDocx(`atlas-pulse-${operation}`, output);
  };

  const handleDownloadMd = () => {
    downloadAsMarkdown(`atlas-pulse-${operation}`, output);
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Atlas Pulse ${OPERATIONS[operation].label}`);
    const body = encodeURIComponent(output.slice(0, 2000));
    window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
  };

  useEffect(() => {
    if (generating) outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output, generating]);

  const operationTitle = { compare: 'Compare Sources', newsletter: 'Generate Newsletter', briefing: 'AI Briefing' };

  return (
    <>
      <ResizableHandle onResize={onResize} />
      <div
        className={`article-reader-panel multi-article-panel${isVisible ? ' visible' : ''}`}
        style={{ width }}
      >
        {/* Header */}
        <div className="map-header">
          <div className="map-header-left">
            <HiOutlineSparkles className="map-header-icon" />
            <span className="map-header-title">{operationTitle[operation]}</span>
          </div>
          <div className="map-header-ops">
            {Object.entries(OPERATIONS).map(([key, def]) => (
              <button
                key={key}
                className={`btn btn-ghost btn-sm map-op-btn${operation === key ? ' active' : ''}`}
                onClick={() => { setOperation(key); setOutput(''); setGenerated(false); setError(null); }}
              >
                {def.label}
              </button>
            ))}
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} title="Close">
            <HiOutlineXMark />
          </button>
        </div>

        {/* Article chips */}
        <div className="map-chips-section">
          <div className="map-chips-row">
            {initialArticles.map(a => {
              const active = chips.includes(a.id);
              return (
                <div key={a.id} className={`map-chip${active ? '' : ' map-chip-removed'}`}>
                  <span className="map-chip-title">{a.feedTitle || 'Unknown'} — {a.title?.slice(0, 40)}{(a.title?.length > 40) ? '…' : ''}</span>
                  {active && (
                    <button className="map-chip-remove" onClick={() => removeChip(a.id)} title="Remove">
                      <HiOutlineXMark />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className={`map-count-hint${!countOk ? ' map-count-warn' : ''}`}>
            {operation === 'compare' && activeArticles.length > op.max
              ? `Compare works best with up to ${op.max} articles — remove ${activeArticles.length - op.max} chip${activeArticles.length - op.max > 1 ? 's' : ''}`
              : activeArticles.length < op.min
              ? `Select at least ${op.min} articles for ${op.label}`
              : `${activeArticles.length} article${activeArticles.length !== 1 ? 's' : ''} · ${op.hint}`}
          </div>
        </div>

        {/* Operation-specific controls */}
        {operation === 'newsletter' && (
          <div className="map-templates">
            {NEWSLETTER_TEMPLATES.map(t => (
              <button
                key={t.id}
                className={`btn btn-sm map-template-btn${template === t.id ? ' active' : ''}`}
                onClick={() => setTemplate(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Instructions */}
        <div className="map-instructions">
          <textarea
            className="map-instructions-input"
            placeholder={operation === 'briefing'
              ? 'Your prompt — e.g. "What are the conflicting claims?" or "Draft talking points for a meeting"'
              : 'Additional instructions (optional)'}
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            rows={operation === 'briefing' ? 3 : 2}
          />
          <div className="map-generate-row">
            {generating ? (
              <button className="btn btn-secondary btn-sm" onClick={stop}>Stop</button>
            ) : (
              <button
                className="btn btn-accent btn-sm"
                onClick={generate}
                disabled={!countOk}
                title={!countOk ? `Need ${op.min}–${op.max} articles` : 'Generate'}
              >
                <HiOutlineSparkles /> Generate
              </button>
            )}
          </div>
        </div>

        {/* Output */}
        <div className="map-output">
          {error && (
            <div className="ai-error" style={{ margin: '16px 20px' }}>
              <HiOutlineExclamationCircle />
              <span>{error}</span>
              <button className="btn btn-ghost btn-sm" onClick={generate}><HiOutlineArrowPath /> Retry</button>
            </div>
          )}

          {!error && !output && !generating && (
            <div className="map-placeholder">
              <HiOutlineSparkles />
              <p>{operation === 'briefing' ? 'Enter your prompt above and click Generate' : `Click Generate to ${operationTitle[operation].toLowerCase()}`}</p>
            </div>
          )}

          {output && (
            <div className="map-output-text">
              <pre className="map-output-pre">{output}</pre>
              {generating && <span className="map-cursor" />}
              <div ref={outputEndRef} />
            </div>
          )}
        </div>

        {/* Export bar */}
        {generated && output && (
          <div className="map-export-bar">
            <button className="btn btn-ghost btn-sm" onClick={handleCopy} title="Copy to clipboard">
              {copied ? <HiOutlineCheck /> : <HiOutlineClipboardDocument />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleDownloadMd} title="Download as Markdown">
              <HiOutlineArrowDownTray /> Markdown
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleDownloadDocx} title="Download as Word document">
              <HiOutlineArrowDownTray /> Word
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleEmail} title="Open in email client">
              <HiOutlineEnvelope /> Email
            </button>
          </div>
        )}
      </div>
    </>
  );
}
