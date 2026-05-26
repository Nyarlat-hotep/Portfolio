import { User, ChevronDown, Phone, X } from 'lucide-react';
import './ComsHeader.css';

export default function ComsHeader({
  client, activeChannel, onChannelChange, onStartCall, callActive,
}) {
  return (
    <div className="bp-coms-header">
      <div className="bp-coms-header__controls">
        <div className="bp-text-controls">
          <button type="button" className="bp-contact-btn" aria-label="Select contact">
            <span className="bp-contact-btn__avatar">
              <User size={16} />
            </span>
            <ChevronDown size={16} />
          </button>

          <span className="bp-coms-header__name" title={client.phone}>
            {client.name}
          </span>
        </div>

        <div className="bp-channel-toggle">
          <button
            type="button"
            className={`bp-channel-toggle__btn${activeChannel === 'text' ? ' bp-channel-toggle__btn--active' : ''}`}
            onClick={() => onChannelChange('text')}
          >
            Text
          </button>
          <button
            type="button"
            className={`bp-channel-toggle__btn${activeChannel === 'chat' ? ' bp-channel-toggle__btn--active' : ''}`}
            onClick={() => onChannelChange('chat')}
          >
            Chat
          </button>
        </div>

        {callActive ? (
          <button
            type="button"
            className="bp-call-btn bp-call-btn--end"
            onClick={() => onStartCall(false)}
            aria-label="End call"
          >
            <X size={16} />
            End call
          </button>
        ) : (
          <button
            type="button"
            className="bp-call-btn"
            onClick={onStartCall}
            aria-label="Start call"
          >
            <Phone size={16} fill="currentColor" />
            Call
          </button>
        )}
      </div>
    </div>
  );
}
