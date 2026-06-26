// Per-client activity timeline for the Activity tab. Grouped by pipeline stage,
// current stage first (numbered badge) followed by completed stages (check
// badge). Static content with the client's name woven into each event.

import { PIPELINE_STAGES } from './clients.js';

// Events for the current stage: a few document uploads + a call.
const currentStageEvents = (name) => [
  {
    type: 'document', time: '12:45pm', ago: '2 days ago',
    title: `Feb. Bank Statement uploaded by ${name}`, doc: 'Feb. Bank Statement',
  },
  {
    type: 'document', time: '12:45pm', ago: '2 days ago',
    title: `02/03/2026 Paystub uploaded by ${name}`, doc: '02/03/2026 Paystub',
  },
  {
    type: 'document', time: '12:45pm', ago: '2 days ago',
    title: `02/17/2026 Paystub uploaded by ${name}`, doc: '02/17/2026 Paystub',
  },
  {
    type: 'call', time: '11:20am', ago: '3 days ago',
    title: `Outbound call – ${name} (Mobile)`, duration: '10:53',
  },
];

// Events for a completed stage.
const completedStageEvents = (name) => [
  {
    type: 'call', time: '9:30am', ago: '5 days ago',
    title: `Outbound call – ${name} (Mobile)`, duration: '6:12',
  },
  {
    type: 'document', time: '2:15pm', ago: '6 days ago',
    title: `Credit authorization uploaded by ${name}`, doc: 'Credit authorization',
  },
];

export function getActivityForClient(client) {
  const name = client.name;
  const currentIdx = PIPELINE_STAGES.findIndex(s => s === client.tag);
  const groups = [];

  // Current stage — numbered badge (count of events).
  const currentEvents = currentStageEvents(name);
  groups.push({
    stage: client.tag,
    status: 'current',
    count: currentEvents.length,
    events: currentEvents,
  });

  // Up to two prior (completed) stages, most recent first.
  for (let i = currentIdx - 1; i >= 0 && i >= currentIdx - 2; i--) {
    groups.push({
      stage: PIPELINE_STAGES[i],
      status: 'complete',
      events: completedStageEvents(name),
    });
  }

  return groups;
}
