import { useEffect, useState } from 'react';
import { Mic, MicOff, PhoneOff, Grid3x3, Pause, UserPlus } from 'lucide-react';
import './ActiveCall.css';

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function ActiveCall({ client, onEnd }) {
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="bp-active-call">
      <div className="bp-active-call__stage">
        <div className="bp-active-call__avatar">{client.initials}</div>
        <div className="bp-active-call__name">{client.name}</div>
        <div className="bp-active-call__status">
          <span className="bp-active-call__pulse" />
          Connected · {formatDuration(seconds)}
        </div>
        <div className="bp-active-call__phone">{client.phone}</div>
      </div>

      <div className="bp-active-call__controls">
        <button
          type="button"
          className={`bp-call-control${muted ? ' bp-call-control--active' : ''}`}
          onClick={() => setMuted(m => !m)}
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        <button type="button" className="bp-call-control" aria-label="Keypad">
          <Grid3x3 size={20} />
        </button>
        <button type="button" className="bp-call-control" aria-label="Hold">
          <Pause size={20} />
        </button>
        <button type="button" className="bp-call-control" aria-label="Add contact">
          <UserPlus size={20} />
        </button>
        <button
          type="button"
          className="bp-call-control bp-call-control--end"
          onClick={onEnd}
          aria-label="End call"
        >
          <PhoneOff size={20} />
        </button>
      </div>

      <div className="bp-active-call__context">
        <div className="bp-active-call__context-title">Pinned client context</div>
        <div className="bp-active-call__context-grid">
          <div className="bp-active-call__context-item">
            <span className="bp-active-call__context-label">Loan #</span>
            <span className="bp-active-call__context-value">{client.loanNumber}</span>
          </div>
          <div className="bp-active-call__context-item">
            <span className="bp-active-call__context-label">Stage</span>
            <span className="bp-active-call__context-value">{client.tag}</span>
          </div>
          <div className="bp-active-call__context-item">
            <span className="bp-active-call__context-label">Loan amount</span>
            <span className="bp-active-call__context-value">{client.baseLoanAmount}</span>
          </div>
          <div className="bp-active-call__context-item">
            <span className="bp-active-call__context-label">Rate</span>
            <span className="bp-active-call__context-value">{client.interestRate}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
