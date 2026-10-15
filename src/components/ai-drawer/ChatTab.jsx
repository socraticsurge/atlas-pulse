import { useEffect, useRef } from 'react';
import {
  HiOutlineExclamationCircle, HiOutlinePaperAirplane, HiOutlineSparkles, HiOutlineXMark,
} from 'react-icons/hi2';

const SUGGESTIONS = ['What are the key takeaways?', 'Explain this in simple terms', "What's the author's main argument?"];

function ChatMessage({ msg, typing }) {
  return (
    <div className={`ai-message ai-message-${msg.role}`}>
      {msg.role === 'assistant' && <div className="ai-message-avatar"><HiOutlineSparkles /></div>}
      <div className="ai-message-bubble">
        {msg.content || (typing ? <span className="ai-typing-cursor" /> : null)}
      </div>
    </div>
  );
}

function ChatEmpty({ onSuggest }) {
  return (
    <div className="ai-chat-empty">
      <HiOutlineSparkles />
      <p>Ask anything about this article</p>
      <div className="ai-chat-suggestions">
        {SUGGESTIONS.map((s) => (
          <button key={s} className="ai-suggestion-chip" onClick={() => onSuggest(s)}>{s}</button>
        ))}
      </div>
    </div>
  );
}

function ChatInput({ chat, inputRef }) {
  const { input, setInput, loading, send, stop } = chat;
  const handleKeyDown = (e) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    e.preventDefault();
    send();
  };
  return (
    <div className="ai-chat-input-row">
      <textarea
        ref={inputRef}
        className="ai-chat-input"
        placeholder="Ask about this article…"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        disabled={loading}
      />
      <button
        className="btn btn-primary ai-send-btn"
        onClick={loading ? stop : send}
        disabled={!loading && !input.trim()}
        title={loading ? 'Stop' : 'Send'}
      >
        {loading ? <HiOutlineXMark /> : <HiOutlinePaperAirplane />}
      </button>
    </div>
  );
}

/** Chat tab: conversation about the article. chat = useArticleChat(). */
export default function ChatTab({ chat }) {
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const { messages, loading, error, setInput } = chat;

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  const suggest = (text) => { setInput(text); inputRef.current?.focus(); };

  return (
    <div className="ai-chat-container">
      <div className="ai-chat-messages">
        {messages.length === 0 && <ChatEmpty onSuggest={suggest} />}
        {messages.map((msg, i) => (
          <ChatMessage key={i} msg={msg} typing={loading && i === messages.length - 1} />
        ))}
        {error && (
          <div className="ai-error">
            <HiOutlineExclamationCircle />
            <span>{error}</span>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <ChatInput chat={chat} inputRef={inputRef} />
    </div>
  );
}
