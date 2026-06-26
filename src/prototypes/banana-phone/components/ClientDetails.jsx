import { useState, useRef, useLayoutEffect } from 'react';
import {
  CircleUser, Rocket, DollarSign, Calendar, CreditCard, Image as ImageIcon,
  Check, ChevronDown, Copy, Search,
} from 'lucide-react';
import { PIPELINE_STAGES, SHARED_LOAN_DETAILS } from '../data/clients.js';
import { getNotesForClient } from '../data/notes.js';
import { getActivityForClient } from '../data/activity.js';
import AssistantTab from './AssistantTab.jsx';
import './ClientDetails.css';

const TABS = ['Assistant', 'Details', 'Contacts', 'Documents', 'Notes', 'Activity'];

function InfoItem({ icon, label, value, accent, full }) {
  return (
    <div className={`bp-info-item${full ? ' bp-info-item--full' : ''}`}>
      <div className="bp-info-item__icon">{icon}</div>
      <div className="bp-info-item__content">
        <span className="bp-info-item__label">{label}</span>
        <span className={`bp-info-item__value${accent ? ' bp-info-item__value--accent' : ''}`}>
          {value}
        </span>
      </div>
    </div>
  );
}

function DetailField({ label, value }) {
  return (
    <div className="bp-detail-field">
      <span className="bp-detail-field__label">{label}</span>
      <span className="bp-detail-field__value">{value}</span>
    </div>
  );
}

function PipelineProgress({ client }) {
  const currentIdx = PIPELINE_STAGES.findIndex(s => s === client.tag);
  // Show prev / current / next as a single connected segmented bar.
  const visible = [currentIdx - 1, currentIdx, currentIdx + 1]
    .filter(i => i >= 0 && i < PIPELINE_STAGES.length)
    .map(i => ({ index: i, label: PIPELINE_STAGES[i] }));

  return (
    <div className="bp-pipeline-progress">
      {visible.map(({ index, label }) => {
        const complete = index < currentIdx;
        const active = index === currentIdx;
        return (
          <div
            key={index}
            className={`bp-pipeline-step${complete ? ' bp-pipeline-step--complete' : ''}${active ? ' bp-pipeline-step--active' : ''}`}
          >
            {complete && <Check size={14} strokeWidth={2.5} />}
            <span>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function Accordion({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bp-accordion">
      <button type="button" className="bp-accordion__header" onClick={() => setOpen(!open)}>
        <span className="bp-accordion__title">{title}</span>
        <ChevronDown
          size={20}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        />
      </button>
      {open && <div className="bp-accordion__content">{children}</div>}
    </div>
  );
}

function DetailsView({ client }) {
  const realtor = client.associatedContacts.find(c => /realtor/i.test(c.role));
  const referredTo = realtor ? realtor.name : 'Direct (online)';

  return (
    <>
      <div className="bp-info-card">
        <button type="button" className="bp-opportunity-number">
          Opportunity <span className="bp-underline">{client.opportunityNumber}</span>
          <ChevronDown size={18} />
        </button>

        <div className="bp-info-grid">
          <div className="bp-info-row">
            <InfoItem icon={<CircleUser size={18} />} label="Client" value={client.name} />
            <InfoItem icon={<Rocket size={18} />} label="Rocket Logic" value={client.loanNumber} accent />
          </div>
          <div className="bp-info-row">
            <InfoItem icon={<DollarSign size={18} />} label="Loan purpose" value={client.loanPurpose} />
            <InfoItem icon={<Calendar size={18} />} label="Time frame to buy" value={client.timeframeToBuy} />
          </div>
          <div className="bp-info-row">
            <InfoItem icon={<CreditCard size={18} />} label="Max approval amount" value={client.maxApprovalAmount} />
            <InfoItem icon={<Calendar size={18} />} label="Opportunity start date" value={client.opportunityStartDate} />
          </div>
          <div className="bp-info-row bp-info-row--full">
            <InfoItem icon={<ImageIcon size={18} />} label="Property address" value={client.propertyAddress} full />
          </div>
        </div>

        <PipelineProgress client={client} />
      </div>

      <Accordion title="Client Contact">
        <div className="bp-detail-grid">
          <DetailField label="Preferred contact time" value={client.preferredContactTime} />
          <DetailField label="Preferred channel" value={client.channelPreference} />
        </div>
      </Accordion>

      <Accordion title="Client details">
        <div className="bp-detail-grid">
          <DetailField label="Occupancy type" value={client.occupancyType} />
          <DetailField label="Lead source" value={SHARED_LOAN_DETAILS.leadSource} />
          <DetailField label="Loan product" value={client.loanProduct} />
          <DetailField label="Lead type code" value={SHARED_LOAN_DETAILS.leadTypeCode} />
          <DetailField label="Rate" value={SHARED_LOAN_DETAILS.rate} />
          <DetailField label="Loan channel" value={SHARED_LOAN_DETAILS.loanChannel} />
          <DetailField label="Interest rate" value={client.interestRate} />
          <DetailField label="Lead category" value={SHARED_LOAN_DETAILS.leadCategory} />
          <DetailField label="Approval amount" value={client.maxApprovalAmount} />
          <DetailField label="Opportunity group" value={SHARED_LOAN_DETAILS.opportunityGroup} />
          <DetailField label="Base loan amount" value={client.baseLoanAmount} />
          <DetailField label="Referred to" value={referredTo} />
        </div>
      </Accordion>
    </>
  );
}

function NotesView({ client }) {
  const notes = getNotesForClient(client);
  return (
    <div className="bp-notes">
      <div className="bp-note-input">
        <textarea
          className="bp-note-input__textarea"
          placeholder="Type a new note..."
          rows={1}
        />
      </div>

      {notes.map((note, i) => (
        <div key={i} className="bp-note-card">
          <p className="bp-note-card__text">{note.text}</p>
          <div className="bp-note-card__meta">
            <span className={`bp-note-card__avatar${note.you ? ' bp-note-card__avatar--you' : ''}`}>
              {note.initials}
            </span>
            <span className="bp-note-card__meta-text">
              {note.author} · {note.datetime} · Recorded in {note.system}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityStage({ group }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bp-act-stage">
      <button type="button" className="bp-act-stage__header" onClick={() => setOpen(o => !o)}>
        <span className={`bp-act-badge${group.status === 'current' ? ' bp-act-badge--current' : ''}`}>
          {group.status === 'current' ? group.count : <Check size={16} strokeWidth={2.5} />}
        </span>
        <span className="bp-act-stage__label">{group.stage}</span>
        <ChevronDown
          size={18}
          className="bp-act-stage__chevron"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        />
      </button>

      {open && (
        <div className="bp-act-stage__events">
          {group.events.map((ev, i) => (
            <div key={i} className="bp-act-event">
              <div className="bp-act-event__head">
                {ev.type === 'document' && <Copy size={18} className="bp-act-event__icon" />}
                <span className="bp-act-event__title">{ev.title}</span>
              </div>
              <span className="bp-act-event__meta">{ev.time} · {ev.ago}</span>
              <div className="bp-act-event__card">
                {ev.type === 'document' ? (
                  <span className="bp-act-doc-chip"><Copy size={16} />{ev.doc}</span>
                ) : (
                  <span className="bp-act-duration">{ev.duration}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityView({ client }) {
  const groups = getActivityForClient(client);
  return (
    <div className="bp-activity">
      <div className="bp-activity__search">
        <Search size={18} />
        <input type="text" placeholder="Search timeline" />
      </div>

      <div className="bp-activity__timeline">
        {groups.map((group, i) => (
          <ActivityStage key={i} group={group} />
        ))}
      </div>
    </div>
  );
}

function ContactsView({ client }) {
  return (
    <div className="bp-contacts-list">
      {client.associatedContacts.map((c, i) => (
        <div key={i} className="bp-contact-row">
          <div className="bp-contact-row__avatar">{c.initials}</div>
          <div className="bp-contact-row__body">
            <span className="bp-contact-row__name">{c.name}</span>
            <span className="bp-contact-row__role">{c.role}</span>
          </div>
          <span className="bp-contact-row__phone">{c.phone}</span>
        </div>
      ))}
    </div>
  );
}

export default function ClientDetails({ client }) {
  const [tab, setTab] = useState('Assistant');
  const tabRefs = useRef({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  // Position the sliding pill under the active tab. useLayoutEffect runs before
  // paint, so the indicator is in place on first render with no flash. Re-runs
  // on tab change and on resize (widths can shift with font load / panel size).
  useLayoutEffect(() => {
    const place = () => {
      const el = tabRefs.current[tab];
      if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [tab]);

  return (
    <aside className="bp-client-details">
      <div className="bp-client-details__controls">
        <div className="bp-segmented-scroll">
          <div className="bp-segmented-control">
            <span
              className="bp-segment-indicator"
              style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }}
            />
            {TABS.map(t => (
              <button
                key={t}
                ref={el => { tabRefs.current[t] = el; }}
                type="button"
                className={`bp-segment${tab === t ? ' bp-segment--active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <button type="button" className="bp-actions-btn">
          Actions
          <ChevronDown size={14} />
        </button>
      </div>

      {tab === 'Assistant' ? (
        <AssistantTab client={client} />
      ) : (
        <div className="bp-client-details__content">
          {tab === 'Details' ? (
            <DetailsView client={client} />
          ) : tab === 'Contacts' ? (
            <ContactsView client={client} />
          ) : tab === 'Notes' ? (
            <NotesView client={client} />
          ) : tab === 'Activity' ? (
            <ActivityView client={client} />
          ) : (
            <div className="bp-empty-tab">
              <span>{tab}</span>
              <p>Not implemented in this prototype.</p>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
