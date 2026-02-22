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
    role: 'Senior Experience Designer',
    duration: '6 months',
    overview: 'The objective of this project was to design and develop a comprehensive financial dashboard that consolidates various products and tools related to client financial goals. The dashboard evolved the Rocket brand beyond personal loans and mortgages into a unified financial hub.',
    challenge: 'Research identified three key challenges: Users lacked confidence making informed financial decisions with multiple options available. Financial information was scattered across accounts and devices, creating data disarray. Users sought clear, goal-oriented paths to specific objectives like home purchases rather than fragmented tools.',
    solution: 'We created a personalized financial dashboard that consolidates accounts, spending habits, credit scores, and goal tracking into a single unified experience. The design emphasized story-driven information hierarchy to help users visualize their progress toward financial goals.',
    impact: 'Achieved 2x increase in monthly visit rate, 61% CSAT score (increasing monthly), and 5.2% lead-to-close rate (1% improvement from pre-launch). Launched with over 500,000 active monthly visitors. Recognized with Hermes Gold Award (July 2023), GDUSA 60th Anniversary Digital Design Award, and Muse Creative Award.',
    process: [
      {
        title: 'Concept Testing',
        description: 'Initial research validated dashboard utility and user desire for personalized, consolidated financial data with control over inputs. We tested multiple concepts to understand which approaches resonated most with users seeking financial clarity.',
        image: '/images/case-studies/myrocket/concept1.png'
      },
      {
        title: 'Iteration',
        description: 'Created priority guides and lower-fidelity designs emphasizing story-driven information hierarchy for goal progress visibility. This phase focused on establishing the right balance between comprehensive data and scannable insights.',
        image: '/images/case-studies/myrocket/wireframe.png'
      },
      {
        title: 'User Testing',
        description: 'Conducted home-buyer focused tests revealing preferences for spending habits tracking, achievement celebrations, and detailed goal factors. Users wanted to feel a sense of progress and accomplishment as they moved toward their financial objectives.',
        image: '/images/case-studies/myrocket/concept-analysis.png'
      },
      {
        title: 'Design Iteration',
        description: 'Narrowed focus to mortgage clients to meet Q4 launch deadline, with a roadmap for expanded features through 2024. This strategic decision allowed us to deliver maximum value to our core user segment while planning future growth.',
        image: '/images/case-studies/myrocket/concept2.png'
      },
      {
        title: 'Launch',
        description: 'Launched December 2022 with over 500,000 active monthly visitors. Key learnings addressed personalization complexity and the value of early technical involvement in the design process.',
        image: '/images/case-studies/myrocket/dashboard-final.png'
      }
    ],
    tools: ['Figma', 'Adobe XD', 'Miro', 'UserTesting', 'Maze', 'Jira'],
    images: [
      '/images/case-studies/myrocket/dashboard-hero.png',
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
