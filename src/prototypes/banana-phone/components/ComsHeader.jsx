import { User, ChevronDown, ChevronLeft } from 'lucide-react';
import './ComsHeader.css';

export default function ComsHeader({ client }) {
  return (
    <div className="bp-coms-header">
      <div className="bp-coms-header__controls">
        <div className="bp-text-controls">
          <button type="button" className="bp-contact-btn" aria-label="Select contact">
            <span className="bp-contact-btn__avatar"><User size={16} /></span>
            <ChevronDown size={16} />
          </button>

          <span className="bp-coms-header__name" title={client.phone}>
            {client.name}
          </span>
        </div>

        <button type="button" className="bp-coms-header__collapse" aria-label="Collapse coms window">
          <ChevronLeft size={18} />
        </button>
      </div>
    </div>
  );
}
