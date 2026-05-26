import { useState, useRef, useEffect } from 'react';
import { Plus, Smile, Mic, Send, Sparkles } from 'lucide-react';
import './MessageThread.css';

function Message({ msg }) {
  if (msg.sender === 'system') {
    return (
      <div className="bp-message-divider">
        <hr className="bp-message-divider__line" />
        <span className="bp-message-divider__label">{msg.text}</span>
        <hr className="bp-message-divider__line" />
      </div>
    );
  }
  const isBanker = msg.sender === 'banker';
  return (
    <div className={`bp-message${isBanker ? ' bp-message--banker' : ''}`}>
      <div className="bp-message__avatar">
        <div className={`bp-message__avatar-placeholder${isBanker ? ' bp-message__avatar-placeholder--banker' : ''}`}>
          {msg.initials}
        </div>
      </div>
      <div className="bp-message__body">
        <div className="bp-message__header">
          <span className="bp-message__sender">{msg.senderName}</span>
          <span className="bp-message__time">{msg.time}</span>
        </div>
        <p className="bp-message__text">{msg.text}</p>
      </div>
    </div>
  );
}

export default function MessageThread({ client, threads, onSend }) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);
  const messagesRef = useRef(null);

  const hasMessages = threads.length > 0 && threads.some(t => t.messages.length > 0);

  // Scroll to bottom when threads change
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [threads]);

  const handleSubmit = () => {
    if (!draft.trim()) return;
    onSend(draft);
    setDraft('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e) => {
    setDraft(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };


  return (
    <div className="bp-message-thread">
      <div className="bp-message-thread__messages" ref={messagesRef}>
        {hasMessages ? (
          threads.map((thread, ti) => (
            <div key={ti} className="bp-thread-group">
              <div className="bp-date-divider">
                <hr className="bp-date-divider__line" />
                <span className="bp-date-divider__label">{thread.dateLabel}</span>
                <hr className="bp-date-divider__line" />
              </div>
              {thread.messages.map((msg, mi) => (
                <Message key={`${ti}-${mi}`} msg={msg} />
              ))}
            </div>
          ))
        ) : (
          <div className="bp-message-thread__empty">
            <span className="bp-message-thread__empty-text">
              No messages yet with {client.name}
            </span>
          </div>
        )}
      </div>

      <div className="bp-message-thread__input">
        <div className="bp-message-input">
          <textarea
            ref={inputRef}
            className="bp-message-input__textarea"
            placeholder={`Text ${client.name} a message`}
            value={draft}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            rows={1}
          />

          <div className="bp-message-input__action-bar">
            <button type="button" className="bp-message-input__ai-pill">
              <Sparkles size={14} />
              <span className="bp-message-input__ai-label">AI reply</span>
            </button>

            <div className="bp-message-input__compose-actions">
              <button type="button" className="bp-mt-icon-btn" aria-label="Send options">
                <Plus size={20} />
              </button>
              <button type="button" className="bp-mt-icon-btn" aria-label="Emojis">
                <Smile size={20} />
              </button>
              <button type="button" className="bp-mt-icon-btn" aria-label="Speech to text">
                <Mic size={20} />
              </button>
              <button
                type="button"
                className="bp-send-btn"
                onClick={handleSubmit}
                disabled={!draft.trim()}
                aria-label="Send"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
