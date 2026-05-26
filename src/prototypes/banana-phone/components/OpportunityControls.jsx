import { useState, useEffect } from 'react';
import {
  User, ChevronDown, Mic, Pause, Users, Grid3x3, Phone, X,
} from 'lucide-react';
import './OpportunityControls.css';

function getCurrentTimeLabel(timezoneAbbr) {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${ampm} ${timezoneAbbr || 'EST'}`;
}

export default function OpportunityControls({ client, callActive, onStartCall, onEndCall }) {
  const [timeLabel, setTimeLabel] = useState(() => getCurrentTimeLabel(client.timezone));

  useEffect(() => {
    const id = setInterval(() => setTimeLabel(getCurrentTimeLabel(client.timezone)), 30_000);
    return () => clearInterval(id);
  }, [client.timezone]);

  return (
    <div className={`bp-opportunity-controls${callActive ? ' bp-opportunity-controls--active' : ''}`}>
      <div className="bp-call-controls">
        <button type="button" className="bp-contact-pill" aria-label="Select contact">
          <span className="bp-contact-pill__avatar"><User size={14} /></span>
          <ChevronDown size={14} />
        </button>
        <div className="bp-call-controls__name">{client.name}</div>
        <span className="bp-call-controls__sep">·</span>
        <div className="bp-call-controls__time">{timeLabel}</div>
      </div>

      <div className="bp-opportunity-controls__actions">
        <button type="button" className="bp-oc-icon-btn" aria-label="Microphone">
          <Mic size={18} />
        </button>
        <button type="button" className="bp-oc-icon-btn" aria-label="Hold">
          <Pause size={18} />
        </button>
        <button type="button" className="bp-oc-icon-btn" aria-label="Contacts">
          <Users size={18} />
        </button>
        <button type="button" className="bp-oc-icon-btn" aria-label="Keypad">
          <Grid3x3 size={18} />
        </button>

        {callActive ? (
          <button type="button" className="bp-call-pill bp-call-pill--end" onClick={onEndCall}>
            <X size={16} />
            End call
          </button>
        ) : (
          <button type="button" className="bp-call-pill" onClick={onStartCall}>
            <Phone size={16} fill="currentColor" />
            Mobile {client.phone}
            <ChevronDown size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
