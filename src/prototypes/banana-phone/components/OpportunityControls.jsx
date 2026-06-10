import { useState, useEffect, useMemo, useRef } from 'react';
import {
  User, ChevronDown, Mic, Pause, Users, Grid3x3, Phone, PhoneOff, Plus,
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

function formatElapsed(totalSeconds) {
  const hh = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const mm = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const ss = String(totalSeconds % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

// The client data carries a single number; synthesize stable Work/Home
// alternates so the line-picker popout has realistic content.
function buildPhoneNumbers(client) {
  const base = client.phone || '';
  return [
    { label: 'Mobile', number: base },
    { label: 'Work', number: base.replace(/\d{4}$/, '0114') },
    { label: 'Home', number: base.replace(/\d{4}$/, '8830') },
  ];
}

export default function OpportunityControls({ client, callActive, onStartCall, onEndCall }) {
  // Per-client state (selected line, etc.) is reset by remounting via a `key`
  // on this component in the parent — so no in-render resets are needed here.
  const [timeLabel, setTimeLabel] = useState(() => getCurrentTimeLabel(client.timezone));
  const phoneNumbers = useMemo(() => buildPhoneNumbers(client), [client]);
  const [selectedPhone, setSelectedPhone] = useState(0);
  const [phoneMenuOpen, setPhoneMenuOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const dialRef = useRef(null);

  // Wall clock (timezone label) — refreshed every 30s.
  useEffect(() => {
    const id = setInterval(() => setTimeLabel(getCurrentTimeLabel(client.timezone)), 30_000);
    return () => clearInterval(id);
  }, [client.timezone]);

  // Call duration — counts up from the moment the call became active, and
  // resets to 0 when it ends (cleanup). Elapsed is computed from a captured
  // start time so the ticks stay accurate.
  useEffect(() => {
    if (!callActive) return;
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => { clearInterval(id); setElapsed(0); };
  }, [callActive]);

  // Close the line-picker popout on outside click.
  useEffect(() => {
    if (!phoneMenuOpen) return;
    const onDown = (e) => {
      if (dialRef.current && !dialRef.current.contains(e.target)) setPhoneMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [phoneMenuOpen]);

  const initials = client.initials
    || client.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const selected = phoneNumbers[selectedPhone];
  const status = elapsed < 3 ? 'Connecting' : 'In call';

  return (
    // `key` swaps the bar for a fresh DOM node on call-state change. Without
    // it, Chromium reuses the node and skips repainting the background/pill
    // color change (the bar sits inside an overflow:hidden ancestor), so the
    // active state only appeared after a reflow. Same stale-paint bug as the
    // ClientDetails segmented control.
    <div
      key={callActive ? 'active' : 'idle'}
      className={`bp-opportunity-controls${callActive ? ' bp-opportunity-controls--active' : ''}`}
    >
      <div className="bp-call-controls-group">
      <div className="bp-call-controls">
        {callActive ? (
          <span className="bp-call-avatar" aria-hidden="true">
            {initials}
            <span className="bp-call-avatar__status" />
          </span>
        ) : (
          <button type="button" className="bp-contact-pill" aria-label="Select contact">
            <span className="bp-contact-pill__avatar"><User size={16} /></span>
            <ChevronDown size={16} />
          </button>
        )}

        <span className="bp-call-controls__name">{client.name}</span>
        <span className="bp-call-controls__sep">·</span>

        {callActive && (
          <>
            <span className="bp-call-controls__status">{status}</span>
            <span className="bp-call-controls__sep">·</span>
            <span className="bp-call-controls__timer">{formatElapsed(elapsed)}</span>
            <span className="bp-call-controls__sep">·</span>
          </>
        )}

        <span className="bp-call-controls__time">{timeLabel}</span>
      </div>

      <div className="bp-opportunity-controls__actions">
        <button type="button" className="bp-oc-icon-btn" aria-label="Mute">
          <Mic size={20} />
        </button>
        <button type="button" className="bp-oc-icon-btn" aria-label="Hold">
          <Pause size={20} />
        </button>
        <button type="button" className="bp-oc-icon-btn" aria-label="Conference">
          <Users size={20} />
        </button>
        <button type="button" className="bp-oc-icon-btn" aria-label="Number pad">
          <Grid3x3 size={20} />
        </button>

        <div className="bp-call-dial" ref={dialRef}>
          {callActive ? (
            <button type="button" className="bp-call-pill bp-call-pill--end" onClick={onEndCall}>
              <PhoneOff size={16} />
              End call
            </button>
          ) : (
            <button type="button" className="bp-call-pill" onClick={onStartCall}>
              <Phone size={16} fill="currentColor" />
              {selected.label} {selected.number}
            </button>
          )}

          <button
            type="button"
            className="bp-call-split"
            aria-label="Other numbers"
            aria-expanded={phoneMenuOpen}
            disabled={callActive}
            onClick={() => setPhoneMenuOpen(o => !o)}
          >
            <ChevronDown size={16} />
          </button>

          {phoneMenuOpen && (
            <div className="bp-phone-menu" role="menu">
              {phoneNumbers.map((p, i) => (
                <button
                  key={p.label}
                  type="button"
                  role="menuitem"
                  className={`bp-phone-menu__item${i === selectedPhone ? ' bp-phone-menu__item--active' : ''}`}
                  onClick={() => { setSelectedPhone(i); setPhoneMenuOpen(false); }}
                >
                  <span className="bp-phone-menu__label">{p.label}</span>
                  <span className="bp-phone-menu__number">{p.number}</span>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>
      </div>

      {callActive && (
        <button type="button" className="bp-open-line">
          <Plus size={16} />
          Open line
        </button>
      )}
    </div>
  );
}
