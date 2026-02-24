// Case study content - Update with your actual project details
export const caseStudies = {
  'case-study-1': {
    id: 'case-study-1',
    title: 'Project Title 1',
    subtitle: 'Product Design • 2025',
    company: 'Company Name',
    role: 'Lead Product Designer',
    duration: '6 months',
    overview: 'A brief overview of the project. This should be 2-3 sentences explaining what the project was about and your role in it.',
    challenge: 'What problem were you solving? What were the constraints or challenges you faced?',
    solution: 'How did you approach solving this problem? What methods, processes, or design decisions did you make?',
    impact: 'What were the results? Include metrics if possible (increased conversion, improved user satisfaction, etc.)',
    tools: ['Figma', 'Adobe XD', 'Miro', 'UserTesting'],
    images: [null, null, null],
    comparisons: [
      { before: null, after: null, beforeLabel: 'Before', afterLabel: 'After' }
    ],
    links: {
      // prototype: 'https://figma.com/...',
      // live: 'https://example.com'
    }
  },
  'case-study-2': {
    id: 'case-study-2',
    title: 'MyRocket Dashboard',
    subtitle: 'Product Design • 2022',
    company: 'Rocket Mortgage',
    role: 'Design Lead, Consumer Experience',
    duration: '6 months',

    overview: 'MyRocket Dashboard was Rocket\'s first move beyond transactional finance — a platform designed to give clients a continuous, goal-oriented relationship with their money rather than a series of disconnected product interactions. As design lead on a cross-functional team of three, I set the product\'s information architecture, visual hierarchy, and interaction model from early concept through a live launch to 500,000+ monthly active users.',

    challenge: 'Three tensions defined this project. Users were making major financial decisions without a coherent picture of their own financial situation. Two internal business units — Rocket Mortgage and Rocket Money — were competing for page real estate with conflicting priorities. And the product needed to surface features users hadn\'t yet activated without creating friction or a sense of exclusion. Resolving all three simultaneously, at scale, was the central design problem.',

    solution: 'I defined an information architecture that could flex across radically different user states — from a first-time homebuyer with no connected accounts to a mortgage client actively tracking their payoff path. The existing mortgage relationship anchored the top of the page; Rocket Money\'s presence was negotiated down to its highest-signal modules. For features users hadn\'t yet activated, I introduced a locked state pattern — drawn from gaming and subscription UI — that showed the value and path to activation rather than hiding the capability. I faced significant pushback on this in a financial product context, but defended it as a well-established convention. It launched as a core onboarding mechanism. A progressive disclosure principle governed every hierarchy decision: orient and motivate first, invite depth on demand.',

    impact: '2× increase in monthly visit rate. 61% CSAT, growing monthly at launch. 5.2% lead-to-close rate — a 1-point gain over pre-launch baseline. 500,000+ active monthly users at launch. Recognized with a Hermes Gold Award (July 2023), GDUSA 60th Anniversary Digital Design Award, and Muse Creative Award.',

    process: [
      {
        title: 'Vision & Early Concept',
        description: 'We opened with a high-fidelity vision artifact — a concept designed to test appetite, not feasibility. I co-directed the concept to surface what users actually wanted from a unified financial view, validate the dashboard\'s core utility, and establish a north star the team could pressure-test in every subsequent decision. Research confirmed strong user desire for personalized, consolidated financial data — and revealed that goal-oriented framing mattered more than feature breadth.',
        image: '/images/case-studies/myrocket/concept1.png'
      },
      {
        title: 'IA & Lo-fi Exploration',
        description: 'Before any visual design, I mapped the information architecture across a wide range of user financial states — first-time homebuyers, existing mortgage clients, users with connected Rocket Money accounts, and those with none. The core challenge was designing a page hierarchy that felt coherent and personal regardless of how much data a user had connected. These lo-fi structures and priority guides became the foundation for every stakeholder alignment conversation that followed.',
        image: '/images/case-studies/myrocket/concept-analysis.png'
      },
      {
        title: 'Scope Decision & Iteration',
        description: 'With a Q4 deadline, the business decision was made to narrow scope to existing mortgage clients — a deliberate trade to go deep on one segment rather than thin across many. I aligned to this constraint and used it to sharpen the product\'s focus. This phase also saw the most stakeholder negotiation. The IA provoked real disagreement between mortgage servicing, Rocket Money, PM, and engineering — each advocating for their product\'s priority. I led multiple alignment sessions, making the case repeatedly for a structure that served users\' mental models rather than the org chart.',
        image: '/images/case-studies/myrocket/concept2.png'
      },
      {
        title: 'Launch',
        description: 'Launched December 2022 with 500,000+ active monthly users. The shipped experience reflected a deliberate hierarchy: mortgage relationship at top, Rocket Money\'s essential modules below, and a locked state mechanism providing a clear activation path for unconnected features. One of my key learnings from this phase was the value of early engineering involvement — getting technical constraints on the table sooner would have protected more of the design intent through implementation.',
        image: '/images/case-studies/myrocket/wireframe.png'
      },
      {
        title: 'Design System Influence',
        description: 'Working within Rocket\'s design system, I identified two gaps that required advocacy beyond the project itself. The first was a locked state variant for card components — the pattern I\'d championed for MyRocket needed a home in the system so other teams could use it. The second was a redesigned credit score dial with the visual weight and expressiveness the context required. I brought both through the DS team\'s review process. Both were adopted. Small contributions, but the kind that compound across a product organization.',
        image: '/images/case-studies/myrocket/lockedstate.png'
      },
      {
        title: 'Retrospective',
        description: 'An early concept I pushed for — a mortgage component illustration that responded to time of day and season with character-driven animation — was scoped out during production. Two years later, the team that inherited the product is exploring precisely those concepts and generating significant internal momentum around them. The visuals in this case study represent the future-state concepts we envisioned but didn\'t ship. Delight isn\'t polish — it\'s a retention strategy, and it compounds. Being ahead of that curve is something I\'d push harder for earlier.',
        image: '/images/case-studies/myrocket/dashboard-hero.png'
      }
    ],

    tools: ['Figma', 'Miro', 'UserTesting', 'Maze', 'Jira'],
    images: [
      '/images/case-studies/myrocket/dashboard-final.png'
    ],
    links: {}
  },
  'case-study-3': {
    id: 'case-study-3',
    title: 'Project Title 3',
    subtitle: 'UX Research • 2024',
    company: 'Company Name',
    role: 'UX Researcher & Designer',
    duration: '3 months',
    overview: 'Project overview goes here...',
    challenge: 'Challenge description...',
    solution: 'Solution approach...',
    impact: 'Results and impact...',
    tools: ['Figma', 'Optimal Workshop', 'Maze'],
    images: [null, null, null],
    comparisons: [
      { before: null, after: null, beforeLabel: 'Before', afterLabel: 'After' }
    ],
    links: {}
  }
};

// About me content
export const aboutContent = {
  name: 'I.x35',
  tagline: 'Product Designer crafting meaningful digital experiences',
  bio: [
    'First paragraph about your background, experience, and what drives you as a designer.',
    'Second paragraph about your approach to design, your specialties, or your design philosophy.',
    'Third paragraph about what you\'re currently working on or what you\'re passionate about.'
  ],
  skills: [
    'User Research',
    'UI/UX Design',
    'Prototyping',
    'Design Systems',
    'Usability Testing',
    'Information Architecture',
    'Interaction Design',
    'Visual Design'
  ],
  tools: [
    'Figma',
    'Adobe Creative Suite',
    'Sketch',
    'Principle',
    'Miro',
    'UserTesting',
    'Maze'
  ],
  contact: {
    email: 'tcorneliusart@gmail.com',
    // Add other contact methods if desired
  },
  social: {
    linkedin: 'https://www.linkedin.com/in/taylorcornelius/',
    dribbble: 'https://dribbble.com/TCorn',
  },
  resumeUrl: 'https://docs.google.com/document/d/1MZpPM44NnQ5yHdLSswazOjt50sq1u0D3/edit?usp=sharing&ouid=103186051145042843959&rtpof=true&sd=true' // Place your resume in the public folder
};
