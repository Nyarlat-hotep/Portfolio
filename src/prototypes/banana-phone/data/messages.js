// Mock message threads, ported from MOCK_THREADS in the source repo.
// Each thread is keyed by clientId. Only a few have populated threads;
// the rest return empty (which the UI handles gracefully).

const B = (time, text) => ({
  sender: 'banker', senderName: 'Clair Thomas', initials: 'CT', time, text,
});
const C = (name, initials, time, text) => ({
  sender: 'client', senderName: name, initials, time, text,
});

export const MOCK_THREADS = {
  10: [
    {
      dateLabel: 'Yesterday',
      messages: [
        B('10:30am', 'Hi Brian, the appraisal came in right where we expected. Last thing I need from you is your W2s and last two tax returns to finalize the application.'),
        C('Brian Thompson', 'BT', '11:00am', "I'll pull them together tonight and send over tomorrow morning."),
        B('11:05am', "No problem — take your time. I'll be here."),
      ],
    },
  ],
  1: [
    {
      dateLabel: 'Today',
      messages: [
        B('9:40am', 'Hi Kimberly — looped back with underwriting on your file. We need the latest pay stub to wrap up the application this week.'),
        C('Kimberly Lake', 'KL', '9:42am', "Got it. I'll grab it now and send it over."),
        B('9:43am', 'Perfect, thanks. Anything else come up overnight?'),
        C('Kimberly Lake', 'KL', '9:45am', 'Nope all good. Pay stub incoming in a few minutes.'),
      ],
    },
  ],
  5: [
    {
      dateLabel: 'Today',
      messages: [
        B('1:00pm', 'Hi Anna! Quick heads up — rates ticked down this morning. Worth a 5 minute call to lock?'),
        C('Anna Brooks', 'AB', '1:15pm', "Yes please. I'm free in about an hour, does that work?"),
        B('1:16pm', 'Works for me. Talk to you at 2:15.'),
      ],
    },
  ],
  13: [
    {
      dateLabel: 'Today',
      messages: [
        B('12:00pm', "Hi Carmen, I've ordered the appraisal — it's scheduled for this Thursday. I'll keep you posted on the results."),
        C('Carmen Nguyen', 'CN', '12:15pm', 'Perfect, thank you! The sellers are eager to close so any speed helps.'),
      ],
    },
  ],
  2: [
    {
      dateLabel: '2 days ago',
      messages: [
        B('10:10am', "Hi Marcus — congrats on getting through the credit pull. Whenever you're ready to start the application, just say the word."),
      ],
    },
  ],
  16: [
    {
      dateLabel: 'Today',
      messages: [
        B('9:25am', "Hi Henry — final walkthrough is locked in for Thursday at 4:30pm. You're all set. We'll close Friday morning."),
        C('Henry Lee', 'HL', '9:28am', "Great. I'll be there."),
      ],
    },
  ],
};

export function getThreadsForClient(clientId) {
  return MOCK_THREADS[clientId] || [];
}
