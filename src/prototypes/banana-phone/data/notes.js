// Per-client note history for the Notes tab. Note text varies by client; the
// author/date/system metadata is shared (same five-entry timeline reused), so
// every client reads as their own thread without duplicating meta everywhere.

const firstNameOf = (name) => name.split(' ')[0];

// Shared metadata for the five most-recent notes (newest first), matching the
// reference: mostly "you" (Clair Thomas / CT), one teammate (Doug Benson / DB).
const META = [
  { by: 'you',         initials: 'CT', datetime: '10/2/2025, 2:30pm', system: 'AMP' },
  { by: 'Doug Benson', initials: 'DB', datetime: '10/2/2025, 2:30pm', system: 'AMP' },
  { by: 'you',         initials: 'CT', datetime: '10/1/2025, 2:30pm', system: 'AMP' },
  { by: 'you',         initials: 'CT', datetime: '9/30/2025, 2:30pm', system: 'Rocket OS' },
  { by: 'you',         initials: 'CT', datetime: '9/29/2025, 2:30pm', system: 'Rocket OS' },
];

// Hand-authored note text (newest first) keyed by client id.
const BESPOKE = {
  // Kimberly Lake — purchase, rate objection
  1: [
    'Next Steps – Scheduled call to walk through rate scenarios and a potential float-down. Client wants options before committing.',
    "Documentation Request – Sent list of required docs (income, bank statements, ID). Client confirmed they'll provide by end of week.",
    'Pre-Qualification Discussion – Confirmed $800K approval; target purchase around $760K in Detroit. Wants to keep the payment manageable.',
    'Follow-Up Text – Addressed concern about the 6.50% rate; explained recent stability and how a float-down works. Client seemed reassured.',
    'Initial Call – Client expressed concern about high mortgage rates; hesitant to move forward. Working with realtor Jim Smith.',
  ],
  // Brian Thompson — refinance stalling on documents
  10: [
    'Next Steps – Scheduled 1:00pm rate-lock discussion. Need W2s and tax returns before we can proceed.',
    'Documentation Request – Sent list of required docs (W2s, tax returns, bank statements). Co-client Karen looped in.',
    'Pre-Qualification Discussion – Reviewed refinance goals; the ARM 5/1 trims the monthly payment meaningfully vs. the current loan.',
    'Follow-Up Text – Reminded Brian the rate-lock window is open; getting docs in keeps the timeline on track.',
    'Initial Call – Brian interested in refinancing his primary residence; reviewed ARM vs. fixed trade-offs.',
  ],
  // Gregory Nash — refinance waiting on employment verification
  8: [
    'Next Steps – Scheduled a verification-of-employment call to clear the outstanding condition.',
    'Documentation Request – Sent list of required docs (employment verification, recent paystubs). Awaiting response.',
    'Pre-Qualification Discussion – Confirmed the 15-year refinance keeps lifetime interest low at 5.75%.',
    "Follow-Up Text – Returned Gregory's voicemail; recapped the remaining employment condition.",
    'Initial Call – Gregory interested in a 15-year refinance; folder received, employment docs still pending.',
  ],
};

function templateFor(client) {
  return [
    `Next Steps – Scheduled call to review ${client.nextAction.toLowerCase()} once documents received. Timeline: ${client.timeframeToBuy}.`,
    'Documentation Request – Sent list of required docs (income, bank statements). Client confirmed they will provide by end of week.',
    `Pre-Qualification Discussion – Gathered basic financials; ${client.maxApprovalAmount} approval confirmed. Reviewed a comfortable monthly payment.`,
    `Follow-Up Text – Walked through ${client.loanProduct}; client more confident after comparing options.`,
    `Initial Call – Client exploring a ${client.loanPurpose.toLowerCase()}; reviewed the current rate environment and next steps.`,
  ];
}

export function getNotesForClient(client) {
  const texts = BESPOKE[client.id] || templateFor(client);
  return texts.map((text, i) => {
    const meta = META[i];
    return {
      text,
      author: meta.by === 'you' ? 'By you' : meta.by,
      initials: meta.initials,
      you: meta.by === 'you',
      datetime: meta.datetime,
      system: meta.system,
    };
  });
}
