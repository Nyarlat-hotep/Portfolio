import { useMemo, useState } from 'react';
import {
  Search, X, SlidersHorizontal, MessageSquare, PhoneCall, PhoneMissed, Voicemail, ArrowRight,
  ChevronDown, Diamond, MoreVertical,
} from 'lucide-react';
import './PipelinePanel.css';

// Lead grouping — mirrors source repo's buildSections.
// "Action required" mirrors source's inbox: clients whose last contact was a
// missed call, voicemail, or unanswered text (the cases a banker needs to
// follow up on). Remaining clients fall through propensity buckets.
function buildSections(clients) {
  const ACTION_CHANNELS = new Set(['missed-call', 'voicemail', 'text']);
  const actionReq = [];
  const remaining = [];
  for (const c of clients) {
    if (c.lastContact && ACTION_CHANNELS.has(c.lastContact.channel)) {
      actionReq.push(c);
    } else {
      remaining.push(c);
    }
  }

  const top = [];
  const hot = [];
  const follow = [];
  for (const c of remaining) {
    if (c.propensity === 'high') top.push(c);
    else if (c.propensity === 'medium') hot.push(c);
    else follow.push(c);
  }

  return [
    { id: 'action-required', label: 'Action required', leads: actionReq },
    { id: 'top-ops', label: 'Top opportunities', leads: top },
    { id: 'hotlist', label: 'Hotlist', leads: hot },
    { id: 'follow-ups', label: 'Follow ups', leads: follow },
  ].filter(s => s.leads.length > 0);
}

function channelIcon(channel) {
  switch (channel) {
    case 'text':          return <MessageSquare size={14} />;
    case 'call-outbound':
    case 'call-inbound':  return <PhoneCall size={14} />;
    case 'missed-call':   return <PhoneMissed size={14} />;
    case 'voicemail':     return <Voicemail size={14} />;
    default:              return <MessageSquare size={14} />;
  }
}

function LeadCard({ lead, selected, callActive, onClick }) {
  const showActiveCallChip = callActive;
  return (
    <div
      className={`bp-lead-card${selected ? ' bp-lead-card--active' : ''}`}
      onClick={onClick}
    >
      <div className="bp-lead-card__header">
        <span className="bp-lead-card__name">{lead.name}</span>
        {showActiveCallChip ? (
          <span className="bp-contact-chip bp-contact-chip--active-call">
            <PhoneCall size={14} />
            <span>Active call</span>
          </span>
        ) : lead.lastContact ? (
          <span className={`bp-contact-chip bp-contact-chip--${lead.lastContact.channel}`}>
            {channelIcon(lead.lastContact.channel)}
            <span>{lead.lastContact.elapsed}</span>
          </span>
        ) : null}
      </div>

      <div className="bp-lead-card__action">
        <Diamond size={10} className="bp-lead-card__action-diamond" fill="currentColor" />
        <span className="bp-lead-card__action-text">{lead.nextAction}</span>
        <button
          type="button"
          className="bp-lead-card__more"
          aria-label="More options"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical size={16} />
        </button>
      </div>

      <div className="bp-lead-card__footer">
        <div className="bp-lead-card__footer-col">
          <span className="bp-lead-card__footer-label">Loan number</span>
          <span className="bp-lead-card__footer-value">{lead.loanNumber}</span>
        </div>
        <div className="bp-lead-card__footer-divider" />
        <div className="bp-lead-card__footer-col">
          <span className="bp-lead-card__footer-label">Loan status</span>
          <span className="bp-lead-card__footer-value">{lead.tag}</span>
        </div>
        <div className="bp-lead-card__footer-divider" />
        <div className="bp-lead-card__footer-col">
          <span className="bp-lead-card__footer-label">Channel</span>
          <span className="bp-lead-card__footer-value">{lead.channelPreference}</span>
        </div>
      </div>

      {selected && (
        <div className="bp-lead-card__move">
          <span className="bp-lead-card__move-label">Move lead to contacted</span>
          <button
            className="bp-lead-card__move-btn"
            type="button"
            aria-label="Move to contacted"
            onClick={(e) => e.stopPropagation()}
          >
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function PipelinePanel({
  clients, selectedId, onSelect, activeTab, onTabChange, callActiveClientId,
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.tag.toLowerCase().includes(q) ||
      c.nextAction.toLowerCase().includes(q) ||
      c.loanNumber.includes(q)
    );
  }, [clients, search]);

  const sections = useMemo(() => buildSections(filtered), [filtered]);

  return (
    <aside className="bp-pipeline-panel">
      <div className="bp-pipeline-panel__search">
        <div className="bp-search-bar">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search leads"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            spellCheck="false"
            autoComplete="off"
          />
          {search && (
            <button
              type="button"
              className="bp-search-bar__clear"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button className="bp-icon-btn" type="button" aria-label="Filter">
          <SlidersHorizontal size={18} />
        </button>
      </div>

      <div className="bp-pipeline-tabs">
        <button
          className={`bp-pipeline-tab${activeTab === 'clients' ? ' bp-pipeline-tab--active' : ''}`}
          onClick={() => onTabChange('clients')}
        >
          Clients <span className="bp-pipeline-tab__count">{clients.length}</span>
        </button>
        <button
          className={`bp-pipeline-tab${activeTab === 'calendar' ? ' bp-pipeline-tab--active' : ''}`}
          onClick={() => onTabChange('calendar')}
        >
          Calendar <span className="bp-pipeline-tab__count">5</span>
        </button>
        <button
          className={`bp-pipeline-tab${activeTab === 'contacted' ? ' bp-pipeline-tab--active' : ''}`}
          onClick={() => onTabChange('contacted')}
        >
          Contacted <span className="bp-pipeline-tab__count">0</span>
        </button>
      </div>

      <div className="bp-pipeline-panel__leads bp-pipeline-panel__leads--with-footer">
        {activeTab !== 'clients' ? (
          <div className="bp-empty-tab">
            <span>{activeTab === 'calendar' ? 'Calendar' : 'Contacted'} view</span>
            <p>Not implemented in this prototype.</p>
          </div>
        ) : sections.length === 0 ? (
          <div className="bp-empty-tab">
            <span>No leads match your search</span>
          </div>
        ) : (
          sections.map(section => (
            <details key={section.id} className={`bp-pl-section bp-pl-section--${section.id}`} open>
              <summary className="bp-pl-section__header">
                <span className={`bp-pl-section__chip bp-pl-section__chip--${section.id}`}>
                  {section.leads.length}
                </span>
                <span className="bp-pl-section__label">{section.label}</span>
                <ChevronDown size={16} className="bp-pl-section__chevron" />
              </summary>
              <div className="bp-lead-list">
                {section.leads.map(lead => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    selected={lead.id === selectedId}
                    callActive={lead.id === callActiveClientId}
                    onClick={() => onSelect(lead)}
                  />
                ))}
              </div>
            </details>
          ))
        )}
      </div>

      <div className="bp-pipeline-panel__footer">
        <button type="button" className="bp-pipeline-footer-btn">
          AI mass outreach
        </button>
      </div>
    </aside>
  );
}
