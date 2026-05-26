import { lazy } from 'react';

// Prototype registry. Each entry can be either:
//   - scripted: { steps: [...], component } — driven by useScriptedFlow + NarrationHud
//   - free-click: { component } only — user explores the prototype interactively
//
// The visual component is lazy-loaded so its bundle only ships when opened.
export const PROTOTYPES = {
  'banana-phone': {
    id: 'banana-phone',
    title: 'Banana Phone',
    accent: '#f5c842',
    // Free-click: no scripted steps. User clicks around the live prototype.
    component: lazy(() => import('./banana-phone/BananaPhonePrototype.jsx')),
  },
};

// Warm a prototype's chunk so the click into a demo feels instant.
// Call from a case study page mount.
export function preloadPrototype(id) {
  switch (id) {
    case 'banana-phone':
      import('./banana-phone/BananaPhonePrototype.jsx');
      break;
    default:
      break;
  }
}
