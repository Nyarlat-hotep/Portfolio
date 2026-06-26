// Per-client "Banker Assistant" content for the Assistant tab.
// Bespoke entries are hand-authored for the headliner clients; everyone else
// gets sensible content derived from their existing record. All static.

const firstNameOf = (name) => name.split(' ')[0];

function noticeFor(client) {
  const first = firstNameOf(client.name);
  const lc = client.lastContact || {};
  switch (lc.channel) {
    case 'text':          return `You received a text from ${first}`;
    case 'call-inbound':  return `${first} called you ${lc.elapsed} ago`;
    case 'call-outbound': return `You called ${first} ${lc.elapsed} ago`;
    case 'voicemail':     return `${first} left a voicemail`;
    default:              return `New activity on ${first}'s file`;
  }
}

// Hand-authored content keyed by client id.
const BESPOKE = {
  // Kimberly Lake — purchase, rate objection (matches reference design)
  1: {
    headline: 'Kimberly has concerns about the rate — come prepared with options.',
    snapshot: [
      'Searching for a home in Detroit, MI',
      'Timeframe to buy: Next 3 months',
      'Working with realtor Jim Smith',
      'Interested in Rj30 - Jumbo Smart 30 Year Fixed',
    ],
    recommended: {
      stat: '2.4×',
      statCaption: 'more deals stay alive when you address a rate objection head-on',
      title: "Address Kimberly's rate concern before they disengage",
      bullets: [
        "Rates have been stable — further drops aren't guaranteed",
        'A float-down option lets her capture any rate improvement before closing',
        'Waiting risks losing the property — Detroit inventory is low',
        'At 6.50%, monthly payment is ~$4,735, well within her approval',
        "Every month of waiting is equity she's not building",
      ],
      cta: 'Send rate comparison',
    },
  },

  // Brian Thompson — refinance stalling on documents
  10: {
    headline: "Brian's refinance is stalling on docs — nudge him to upload W2s.",
    snapshot: [
      'Refinancing primary residence in Miami, FL',
      'Rate lock discussion scheduled for 1:00pm',
      'Co-client on file: Karen Thompson',
      'Interested in ARM 5/1 at 5.50%',
    ],
    recommended: {
      stat: '3.1×',
      statCaption: 'more loans close on time when income docs land in the first week',
      title: 'Get Brian to upload W2s and tax returns today',
      bullets: [
        'Application stage stalls without income verification',
        'His rate-lock window is open — docs keep it on track',
        'Offer to walk him through the upload on the 1:00pm call',
        'At 5.50%, the ARM trims his monthly payment meaningfully',
      ],
      cta: 'Send document checklist',
    },
  },

  // Gregory Nash — refinance waiting on employment verification
  8: {
    headline: "Gregory's file is waiting on employment verification — close the gap.",
    snapshot: [
      'Refinancing primary residence in Santa Monica, CA',
      'Folder received — employment docs still outstanding',
      '15-year term keeps total interest low',
      'Prefers weekday calls 1–3pm PST',
    ],
    recommended: {
      stat: '2.7×',
      statCaption: 'faster file completion when employment is verified within 48 hours',
      title: "Verify Gregory's employment documents this week",
      bullets: [
        'Folder Received stage stalls without verified income',
        'A quick verification-of-employment call clears the condition',
        'At 5.75% on a 15-year, he saves heavily on lifetime interest',
        'Returning his voicemail keeps momentum after a day of silence',
      ],
      cta: 'Send verification request',
    },
  },
};

function templateFor(client) {
  const first = firstNameOf(client.name);
  return {
    headline: `${first} is in the ${client.tag} stage — keep momentum on the next step.`,
    snapshot: [
      `${client.loanPurpose} on a ${client.occupancyType.toLowerCase()}`,
      `Interested in ${client.loanProduct} at ${client.interestRate}`,
      `Property: ${client.propertyAddress}`,
      `Prefers ${client.channelPreference.toLowerCase()} · ${client.preferredContactTime}`,
    ],
    recommended: {
      stat: '2.2×',
      statCaption: 'more opportunities advance when the next action happens within a day',
      title: `Move ${first} forward on "${client.nextAction}"`,
      bullets: [
        `Current stage is ${client.tag} — the next step is ${client.nextAction.toLowerCase()}`,
        `Locked at ${client.interestRate}, well inside the ${client.maxApprovalAmount} approval`,
        `Loan-to-value sits at ${client.loanToValue}% on a ${client.estimatedMarketValue} valuation`,
        `Reach out via ${client.channelPreference.toLowerCase()} during ${client.preferredContactTime}`,
      ],
      cta: 'Send next steps',
    },
  };
}

export function getAssistantData(client) {
  const base = BESPOKE[client.id] || templateFor(client);
  return {
    notice: noticeFor(client),
    timestamp: `${client.time} ${client.timezone.toLowerCase()}`,
    ...base,
    currentLoan: [
      { label: 'Loan product', value: client.loanProduct },
      { label: 'Base loan amount', value: client.baseLoanAmount },
      { label: 'Interest rate', value: client.interestRate },
      { label: 'Loan-to-value', value: `${client.loanToValue}%` },
      { label: 'Credit score', value: client.creditScore },
      { label: 'Max approval', value: client.maxApprovalAmount },
    ],
  };
}
