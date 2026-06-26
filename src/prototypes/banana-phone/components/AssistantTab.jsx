import { useState } from 'react';
import {
  Sparkles, Bell, ChevronDown, SquareSlash, CirclePlus, Mic, Send,
} from 'lucide-react';
import { getAssistantData } from '../data/assistant.js';
import './AssistantTab.css';

function Section({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bp-asec">
      <button
        type="button"
        className="bp-asec__header"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="bp-asec__title">{title}</span>
        <ChevronDown
          size={16}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        />
      </button>
      {open && <div className="bp-asec__card">{children}</div>}
    </div>
  );
}

export default function AssistantTab({ client }) {
  const [draft, setDraft] = useState('');
  const data = getAssistantData(client);

  const handleInput = (e) => {
    setDraft(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  return (
    <div className="bp-assistant">
      <div className="bp-assistant__scroll">
        <div className="bp-assistant__header">
          <div className="bp-assistant__avatar">
            <Sparkles size={20} />
          </div>
          <span className="bp-assistant__name">Banker Assistant</span>
          <span className="bp-assistant__time">{data.timestamp}</span>
        </div>

        <div className="bp-assistant__notice">
          <Bell size={15} />
          {data.notice}
        </div>

        <p className="bp-assistant__headline">{data.headline}</p>

        <div className="bp-assistant__panel">
          <Section title="Activity snapshot">
            <ul className="bp-assistant__list">
              {data.snapshot.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </Section>

          <Section title="Current loan" defaultOpen={false}>
            <div className="bp-assistant__kv">
              {data.currentLoan.map((row, i) => (
                <div key={i} className="bp-assistant__kv-row">
                  <span className="bp-assistant__kv-label">{row.label}</span>
                  <span className="bp-assistant__kv-value">{row.value}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Recommended action">
            <div className="bp-rec">
              <div className="bp-rec__stat-col">
                <span className="bp-rec__stat">{data.recommended.stat}</span>
                <span className="bp-rec__stat-caption">{data.recommended.statCaption}</span>
              </div>
              <div className="bp-rec__body">
                <span className="bp-rec__title">{data.recommended.title}</span>
                <ul className="bp-assistant__list">
                  {data.recommended.bullets.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
                <button type="button" className="bp-rec__cta">
                  {data.recommended.cta}
                </button>
              </div>
            </div>
          </Section>
        </div>
      </div>

      <div className="bp-assistant__composer">
        <div className="bp-assistant-input">
          <textarea
            className="bp-assistant-input__textarea"
            placeholder="Ask the assistant..."
            value={draft}
            onChange={handleInput}
            rows={1}
          />
          <div className="bp-assistant-input__action-bar">
            <button type="button" className="bp-mt-icon-btn" aria-label="Commands">
              <SquareSlash size={20} />
            </button>
            <button type="button" className="bp-mt-icon-btn" aria-label="Add">
              <CirclePlus size={20} />
            </button>
            <button type="button" className="bp-mt-icon-btn" aria-label="Speech to text">
              <Mic size={20} />
            </button>
            <button
              type="button"
              className="bp-send-btn"
              disabled={!draft.trim()}
              aria-label="Send"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
