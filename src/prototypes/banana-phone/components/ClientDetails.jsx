import { useState } from 'react';
import {
  User, Rocket, Home, Calendar, DollarSign, MapPin, Check, ChevronDown,
} from 'lucide-react';
import { PIPELINE_STAGES } from '../data/clients.js';
import './ClientDetails.css';

const TABS = ['Assistant', 'Details', 'Contacts', 'Documents', 'Notes', 'Activity'];

function InfoItem({ icon, label, value, accent }) {
  return (
    <div className="bp-info-item">
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

function PipelineProgress({ client }) {
  const currentIdx = PIPELINE_STAGES.findIndex(s => s === client.tag);
  // Show prev / current / next only
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
            {complete && <Check size={12} />}
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
          size={16}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        />
      </button>
      {open && <div className="bp-accordion__content">{children}</div>}
    </div>
  );
}

export default function ClientDetails({ client }) {
  const [tab, setTab] = useState('Details');

  return (
    <aside className="bp-client-details">
      <div className="bp-client-details__controls">
        <div className="bp-segmented-control">
          {TABS.map(t => (
            <button
              key={t}
              type="button"
              className={`bp-segment${tab === t ? ' bp-segment--active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <button type="button" className="bp-actions-btn">
          Actions
          <ChevronDown size={14} />
        </button>
      </div>

      <div className="bp-client-details__content">
        {tab !== 'Details' ? (
          <div className="bp-empty-tab">
            <span>{tab}</span>
            <p>Not implemented in this prototype.</p>
          </div>
        ) : (
          <>
            <div className="bp-info-card">
              <button type="button" className="bp-opportunity-number">
                Opportunity <span className="bp-underline">{client.opportunityNumber}</span>
              </button>

              <div className="bp-info-grid">
                <div className="bp-info-row">
                  <InfoItem icon={<User size={14} />} label="Client" value={client.name} />
                  <InfoItem icon={<Rocket size={14} />} label="Rocket Logic" value={client.loanNumber} accent />
                </div>
                <div className="bp-info-row">
                  <InfoItem icon={<Home size={14} />} label="Loan purpose" value={client.loanPurpose} />
                  <InfoItem icon={<Calendar size={14} />} label="Time zone" value={client.timezone} />
                </div>
                <div className="bp-info-row">
                  <InfoItem icon={<DollarSign size={14} />} label="Max approval" value={client.maxApprovalAmount} />
                  <InfoItem icon={<DollarSign size={14} />} label="Interest rate" value={client.interestRate} />
                </div>
                <div className="bp-info-row bp-info-row--full">
                  <InfoItem icon={<MapPin size={14} />} label="Property address" value={client.propertyAddress} />
                </div>
              </div>

              <PipelineProgress client={client} />
            </div>

            <Accordion title="Client Contact">
              <div className="bp-info-row">
                <div className="bp-detail-field">
                  <span className="bp-detail-field__label">Preferred contact time</span>
                  <span className="bp-detail-field__value">{client.preferredContactTime}</span>
                </div>
                <div className="bp-detail-field">
                  <span className="bp-detail-field__label">Preferred channel</span>
                  <span className="bp-detail-field__value">{client.channelPreference}</span>
                </div>
              </div>
              <div className="bp-info-row">
                <div className="bp-detail-field">
                  <span className="bp-detail-field__label">Phone</span>
                  <span className="bp-detail-field__value">{client.phone}</span>
                </div>
                <div className="bp-detail-field">
                  <span className="bp-detail-field__label">Location</span>
                  <span className="bp-detail-field__value">{client.city}, {client.state}</span>
                </div>
              </div>
            </Accordion>

            <Accordion title="Loan details">
              <div className="bp-detail-grid">
                <div className="bp-detail-field"><span className="bp-detail-field__label">Occupancy</span><span className="bp-detail-field__value">{client.occupancyType}</span></div>
                <div className="bp-detail-field"><span className="bp-detail-field__label">Loan product</span><span className="bp-detail-field__value">{client.loanProduct}</span></div>
                <div className="bp-detail-field"><span className="bp-detail-field__label">Base loan amount</span><span className="bp-detail-field__value">{client.baseLoanAmount}</span></div>
                <div className="bp-detail-field"><span className="bp-detail-field__label">Estimated market value</span><span className="bp-detail-field__value">{client.estimatedMarketValue}</span></div>
                <div className="bp-detail-field"><span className="bp-detail-field__label">Loan-to-value</span><span className="bp-detail-field__value">{client.loanToValue}%</span></div>
                <div className="bp-detail-field"><span className="bp-detail-field__label">Credit score</span><span className="bp-detail-field__value">{client.creditScore}</span></div>
              </div>
            </Accordion>

            <Accordion title="Associated contacts" defaultOpen={false}>
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
            </Accordion>
          </>
        )}
      </div>
    </aside>
  );
}
