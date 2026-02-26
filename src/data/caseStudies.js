// Case study content - Update with your actual project details
export const caseStudies = {
  'case-study-1': {
    id: 'case-study-1',
    title: 'Banana Phone',
    subtitle: 'Enterprise Product Design • 2024',
    company: 'Rocket Mortgage',
    role: 'Lead Product Designer',
    duration: '3–4 months to launch',

    overview: 'Banana Phone is Rocket Mortgage\'s enterprise communication platform — the tool thousands of mortgage bankers rely on to call, text, and chat with clients throughout the loan process. I joined the project as lead product designer three months before a hard launch deadline, stepping into a product that had been through too many design iterations to count without a coherent strategy to show for it. My job was to stabilize the design direction, make the critical calls needed to ship, and lay the groundwork for what the product could become.',

    challenge: 'The design had been fragmented across multiple product managers who each owned a communication channel — phone calls, texting, chat — and rarely coordinated. The accumulated iterations had produced an interface that prioritized visual minimalism at the expense of usability: important client context was buried behind clicks, the lead queue was hidden, and bankers constantly context-switched between Banana Phone and other internal tools. I inherited this fragmentation with a fixed deadline, a sole-designer scope, and no room to start over.',

    solution: 'I made a foundational shift in design philosophy: enterprise is not consumer. A mortgage banker making dozens of client calls per day needs information surfaced, not hidden. I brought the lead queue — the daily roster of clients a banker works — to a persistent surface so it was never more than a glance away. I surfaced critical client context (address, timezone, loan purpose, loan stage) directly into the communication view rather than requiring navigation to find it. I unified call, text, and chat into a coherent interface that replaced the fragmented multi-system workflow bankers had been managing across separate tools and personal devices. And I served as the connective tissue between product managers who weren\'t talking to each other — establishing design language consistency and advocating for cross-channel coherence that no single PM had the incentive to own.',

    accentColor: '#f5c842',

    impact: 'Launched Q4 2024. Banana Phone became the communication layer for thousands of bankers across Rocket Mortgage — consolidating fragmented systems into a single interface and driving measurable results across every channel from day one.',

    metrics: [
      { value: '650K+', label: 'Client Calls', sublabel: 'made in 2025' },
      { value: '15M+', label: 'Texts Sent', sublabel: 'since Nov 2025' },
      { value: '37.28%', label: 'Response Rate', sublabel: 'client text replies' },
      { value: '425K+', label: 'Online Chats', sublabel: 'completed last quarter' },
      { value: '85%', label: 'Easy to Use', sublabel: 'peak satisfaction score' },
      { value: '85%', label: 'Communication', sublabel: 'helps me communicate' },
    ],

    process: [
      {
        title: 'Audit & Direction',
        description: 'Joining three months before a fixed launch deadline left no room for a formal discovery phase. I did a rapid audit of every design iteration that had accumulated and made a quick call: what was sound, what needed to change before launch, and what would go on a prioritized debt list. The core insight that shaped everything followed quickly: Banana Phone had been designed with consumer UI conventions — minimal chrome, progressive disclosure, information behind clicks. That works for occasional users. It fails bankers who are in the tool all day, making dozens of calls, managing active leads, and needing client context immediately available. I reframed every subsequent decision around that distinction: density and persistence over minimalism.',
        image: null
      },
      {
        title: 'UI Redesign',
        description: 'Two changes defined the redesign. First: the lead queue — a banker\'s daily roster of active client communications — moved from a buried menu item to a persistent sidebar. It had received consistent negative feedback in its hidden state; surfacing it was the most direct usability fix available. Second: critical client context (address, timezone, loan purpose, loan stage) moved into the communication view itself, eliminating the mid-call navigation bankers had been doing to find information they needed to have the conversation.',
        image: null
      },
      {
        title: 'Alignment',
        description: 'With ownership split across PMs who each managed a separate communication channel and rarely coordinated, there was no single person accountable for the coherence of the full experience. I became that connective layer. I established design language consistency across call, text, and chat surfaces, and made the case in every alignment conversation for decisions that served the whole experience rather than any one team\'s slice of it. The product felt disjointed because it was built that way — changing that required both design work and sustained advocacy.',
        image: null
      },
      {
        title: 'Launch',
        description: 'I flew to Rocket\'s headquarters on launch day to help bankers get Banana Phone installed and configured on their machines. I also produced the visual training materials the training organization used for their formal onboarding courses — because getting thousands of bankers from zero to productive in a new communication tool required design judgment on what to explain, in what order, and how to frame a new workflow so it felt approachable rather than disruptive. After launch I addressed prioritized design debt and shifted attention toward what Banana Phone could become. The long-term vision — RocketOS — is a single application that replaces the collection of siloed tools bankers currently use: one interface for cross-channel client communication, persistent client context, and AI assistance surfaced at the right moments in a workflow.',
        image: null
      }
    ],

    images: [],
    links: {}
  },
  'case-study-2': {
    id: 'case-study-2',
    title: 'MyRocket Dashboard',
    subtitle: 'Product Design • 2023',
    company: 'Rocket Mortgage',
    role: 'Design Lead, Consumer Experience',
    duration: '6 months',

    overview: 'MyRocket Dashboard was Rocket\'s first move beyond transactional finance — a platform designed to give clients a continuous, goal-oriented relationship with their money rather than a series of disconnected product interactions. As design lead on a cross-functional team of three, I set the product\'s information architecture, visual hierarchy, and interaction model from early concept through a live launch to 500,000+ monthly active users.',

    challenge: 'Three tensions defined this project. Users were making major financial decisions without a coherent picture of their own financial situation. Two internal business units — Rocket Mortgage and Rocket Money — were competing for page real estate with conflicting priorities. And the product needed to surface features users hadn\'t yet activated without creating friction or a sense of exclusion. Resolving all three simultaneously, at scale, was the central design problem.',

    solution: 'I defined an information architecture that could flex across radically different user states — from a first-time homebuyer with no connected accounts to a mortgage client actively tracking their payoff path. The existing mortgage relationship anchored the top of the page; Rocket Money\'s presence was negotiated down to its highest-signal modules. For features users hadn\'t yet activated, I introduced a locked state pattern — drawn from gaming and subscription UI — that showed the value and path to activation rather than hiding the capability. I faced significant pushback on this in a financial product context, but defended it as a well-established convention. It launched as a core onboarding mechanism. A progressive disclosure principle governed every hierarchy decision: orient and motivate first, invite depth on demand.',

    accentColor: '#22d3ee',

    impact: 'Launched December 2022. MyRocket Dashboard gave Rocket Mortgage clients a unified, goal-oriented view of their financial life for the first time — consolidating fragmented product experiences into a single coherent interface and driving meaningful gains in engagement, conversion, and satisfaction from day one.',

    metrics: [
      { value: '2×', label: 'Monthly Visit Rate', sublabel: 'increase at launch' },
      { value: '500K+', label: 'Monthly Active Users', sublabel: 'at launch' },
      { value: '61%', label: 'CSAT Score', sublabel: 'growing monthly at launch' },
      { value: '5.2%', label: 'Lead-to-Close Rate', sublabel: '+1pt over pre-launch baseline' },
      { value: '3', label: 'Industry Awards', sublabel: 'Hermes Gold, GDUSA, Muse' },
      { value: '2', label: 'Design System Components', sublabel: 'adopted post-launch' },
    ],

    process: [
      {
        title: 'Vision',
        description: 'We opened with a high-fidelity vision artifact — a concept designed to test appetite, not feasibility. I co-directed the concept to surface what users actually wanted from a unified financial view, validate the dashboard\'s core utility, and establish a north star the team could pressure-test in every subsequent decision. Research confirmed strong user desire for personalized, consolidated financial data — and revealed that goal-oriented framing mattered more than feature breadth.',
        image: '/images/case-studies/myrocket/concept1.png'
      },
      {
        title: 'Research & IA',
        description: 'Before any visual design, I mapped the information architecture across a wide range of user financial states — first-time homebuyers, existing mortgage clients, users with connected Rocket Money accounts, and those with none. The core challenge was designing a page hierarchy that felt coherent and personal regardless of how much data a user had connected. These lo-fi structures and priority guides became the foundation for every stakeholder alignment conversation that followed.',
        image: '/images/case-studies/myrocket/concept-analysis.png'
      },
      {
        title: 'Scope & Iteration',
        description: 'With a Q4 deadline, the business decision was made to narrow scope to existing mortgage clients — a deliberate trade to go deep on one segment rather than thin across many. I aligned to this constraint and used it to sharpen the product\'s focus. This phase also saw the most stakeholder negotiation. The IA provoked real disagreement between mortgage servicing, Rocket Money, PM, and engineering — each advocating for their product\'s priority. I led multiple alignment sessions, making the case repeatedly for a structure that served users\' mental models rather than the org chart.',
        image: '/images/case-studies/myrocket/concept2.png'
      },
      {
        title: 'Launch',
        description: 'Launched December 2022 with 500,000+ active monthly users. The shipped experience reflected a deliberate hierarchy: mortgage relationship at top, Rocket Money\'s essential modules below, and a locked state mechanism providing a clear activation path for unconnected features. Post-launch, I brought two design system contributions through review: a locked state variant for card components, and a redesigned credit score dial. Both were adopted. An early concept I pushed for — a mortgage component illustration that responded to time of day and season with character-driven animation — was scoped out during production. Two years later, the team that inherited the product is exploring precisely those concepts and generating significant internal momentum. Being ahead of that curve is something I\'d push harder for earlier.',
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
    title: 'Smart Replies',
    subtitle: 'Enterprise AI • Banana Phone • 2025',
    company: 'Rocket Mortgage',
    role: 'Lead Product Designer',
    duration: 'April – June 2025',

    overview: 'Smart Replies is an AI-powered text drafting feature built inside Banana Phone, Rocket Mortgage\'s enterprise communication platform. When a regulatory change forced thousands of bankers off shortcode numbers and onto individual office lines, mass texting became impossible overnight — spam filters blocked everything. Bankers were left writing every client message by hand, one at a time, at scale. Smart Replies was the answer: an AI that drafts the right message for any point in the client relationship, so bankers can communicate at volume without sacrificing personalization.',

    challenge: 'The problem started with a phone number migration. Rocket Mortgage moved bankers from shared shortcodes to individual office numbers — a compliance-driven change with an unintended consequence: text messages sent at scale now looked like spam. Filters flagged them. Delivery dropped. Bankers who had relied on coordinated outreach across their full client pipeline were suddenly limited to manually composing every message, one contact at a time. For a workforce of thousands handling dozens of active leads each, that\'s not a slowdown — it\'s a breakdown in the client communication model entirely.',

    solution: 'I designed a drafting panel built into Banana Phone\'s existing text interface. A banker triggers the panel, selects from a list of message categories — first-time hello, credit pull objection, rate update, follow-up after no response — and the AI drafts an appropriate message instantly. They can send it as-is or edit before sending. In v1 we launched with approximately 10 categories per banker specialty, covering both purchase and refinance workflows. Categories weren\'t invented at a desk — I ran discovery sessions with banking leaders to map the real moments in a client relationship where language mattered most and where bankers were most likely to hesitate or get it wrong.\n\nThe hardest part of this project wasn\'t the concept — it was the execution. The engineering team had significant technical constraints that forced real compromises on the visual UX I\'d designed. The panel I shipped is not the panel I designed. We traded polish for stability and got to launch on schedule. The model quality improved substantially post-launch as it learned from millions of real interactions, which softened some of those tradeoffs over time.',

    accentColor: '#ec4899',

    impact: 'Launched June 2025. In the first ten weeks alone, bankers sent 1.8 million AI-drafted texts — a volume that would have been impossible to generate manually. By January 2026, 56% of all outbound texts across Rocket Mortgage were AI-generated, with only 13% edited before sending. The model learned fast and got significantly better. This was Rocket Mortgage\'s first major AI integration into the banker workflow — a proof point that changed the internal conversation about what AI assistance could look like in a high-stakes financial context.',

    metrics: [
      { value: '1.8M', label: 'AI Texts Sent', sublabel: 'first 10 weeks post-launch' },
      { value: '$75M', label: 'Closing Volume', sublabel: 'monthly increase attributed' },
      { value: '56%', label: 'AI-Generated', sublabel: 'of all outbound texts by Jan 2026' },
      { value: '~10M', label: 'Total AI Texts', sublabel: 'sent through Jan 2026' },
      { value: '87%', label: 'Sent As-Is', sublabel: 'no edits before sending' },
      { value: '10', label: 'Launch Categories', sublabel: 'per banker specialty' },
    ],

    process: [
      {
        title: 'Problem & Discovery',
        description: 'The number migration wasn\'t a design problem at first — it was a compliance decision made above the product layer. But its downstream consequences landed squarely in the product. Bankers went from coordinated, scalable text outreach to composing every message manually. For bankers managing pipelines of dozens of active clients, that meant fewer touchpoints, slower follow-up, and measurable drops in conversion. Before writing a single line of interface, I ran discovery sessions with banking leaders across purchase and refinance teams to map the real communication moments that defined their workflows — the first hello to a new lead, the credit pull conversation, the rate update, the follow-up after silence. That map became the category architecture for v1: approximately 10 categories per banker specialty.',
        image: null
      },
      {
        title: 'Design',
        description: 'The core interaction is a drafting panel that lives inside Banana Phone\'s existing text interface. A banker triggers it, selects a category or requests the next logical message in a conversation thread, the AI drafts, and they send or edit. Simple. What made it hard was the engineering team\'s technical constraints, which required significant compromises on the visual design I\'d built. I designed for a particular UX. What launched was a more conservative version — less polished, more stable. That\'s a real tradeoff, and it\'s one I\'d revisit given more runway. The interaction model survived intact; some of the craft didn\'t.',
        image: null
      },
      {
        title: 'Pilot',
        description: 'We started small — a controlled pilot with a subset of bankers to test message quality and gather signal before scaling. Alongside that, the legal team reviewed the backend prompts that were powering the AI drafts. Financial communications carry regulatory weight, and an AI generating client-facing messages at this scale required that scrutiny. My involvement in the legal review was limited; my involvement in reading the signal from early pilot users and iterating the category set and flow was not.',
        image: null
      },
      {
        title: 'Launch',
        description: 'Full launch hit in June 2025. The growth curve was steep: 1.8 million AI-drafted texts in the first ten weeks, $75 million attributed to monthly closing volume increases. With millions of real message interactions as training signal, the model improved substantially and quickly — by January 2026, 87% of AI drafts were sent exactly as written. Smart Replies is the first AI feature integrated into the banker workflow at Rocket Mortgage — and it\'s still an island. Today, bankers navigate to a separate page to use it. What this project proved is that bankers will trust AI-drafted communication at high volume when the quality is there, and that changes the internal conversation about what\'s possible next.',
        image: null
      }
    ],

    images: [],
    links: {}
  }
};

// About me content
export const aboutContent = {
  name: 'I.x35',
  tagline: 'Lead Product Designer. Born as an artist, formed to think in systems.',
  bio: [
    'My path into design started with a canvas. I studied drawing and painting — which, it turns out, is a surprisingly useful foundation for a career spent designing digital systems. When a friend pulled me into the world of information architecture, something clicked into place. Hierarchy, flow, the tension between simplicity and depth — those were just composition by another name. I\'ve been chasing that alignment ever since.',
    'I think like a game master. I\'ve always been drawn to games — D&D, strategy systems, anything governed by discoverable rules and hidden logic. That instinct follows me into design: I treat a vague brief not as a problem to solve before I start, but as a world to explore while I do. I find the constraints, pressure-test the assumptions, and look for the move that hasn\'t been tried yet. Ambiguity doesn\'t slow me down — it\'s usually where the most interesting solutions are hiding.',
    'Over eleven years I taught myself front-end development, spent years as the first and only designer at a company that needed everything built from scratch, and worked my way from UI designer to Lead at Rocket — where I now design internal tools for one of the largest banking forces in the country. The problems are bigger, the stakes are real, and the systems are endlessly complex. That\'s exactly where I want to be.'
  ],
  skills: [
    'Design Thinking',
    'Design Strategy',
    'Advanced Prototyping',
    'Design Systems',
    'Usability Testing',
    'Information Architecture',
    'Interaction Design',
    'Visual Design',
    'Prompting for AI',
    'Team Leadership',
    'Cross-Functional Collaboration',
    'Communication and Storytelling'
  ],
  tools: [
    'Figma',
    'Adobe Creative Suite',
    'Vercel',
    'Claude',
    'Figma Make',
    'Sour Skittles'

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
