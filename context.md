# Product Designer Portfolio - Project Context

**Last Updated:** 2026-01-15

## Project Overview

A futuristic 3D portfolio website featuring an interactive galaxy interface where planets represent different sections (case studies, about page, etc.). Users navigate through space using camera controls and click on celestial bodies to view content.

## Vision

Create an immersive, sci-fi themed portfolio that showcases product design work through a unique 3D galaxy navigation experience. The interface should feel like exploring a personal universe where each planet holds a story.

## Tech Stack

### Core Technologies
- **Framework:** React 18+ with Vite
- **Language:** JavaScript (ES6+)
- **3D Engine:** Three.js via React Three Fiber
- **Routing:** React Router DOM
- **State Management:** Zustand
- **Animation:** Framer Motion (UI) + R3F native (3D)

### Key Libraries
```json
{
  "three": "^0.x.x",
  "@react-three/fiber": "^8.x.x",
  "@react-three/drei": "^9.x.x",
  "@react-three/postprocessing": "^2.x.x",
  "react-router-dom": "^6.x.x",
  "framer-motion": "^11.x.x",
  "zustand": "^4.x.x"
}
```

## Project Structure

```
portfolio/
├── src/
│   ├── components/
│   │   ├── Galaxy/           # 3D scene components
│   │   │   ├── Galaxy.jsx    # Main scene container
│   │   │   ├── Planet.jsx    # Individual planet component
│   │   │   ├── Starfield.jsx # Background stars
│   │   │   └── CameraController.jsx # Camera animations
│   │   ├── Navigation/
│   │   │   └── BottomNav.jsx # Bottom-left navigation menu
│   │   ├── Pages/
│   │   │   ├── CaseStudy.jsx # Case study template
│   │   │   └── About.jsx     # About me page
│   │   └── UI/
│   │       └── PageOverlay.jsx # Modal overlay for content
│   ├── data/
│   │   ├── planets.js        # Planet positions and metadata
│   │   └── caseStudies.js    # Case study content
│   ├── assets/               # Images, models, fonts
│   ├── styles/               # Global styles, variables
│   ├── App.jsx              # Root component
│   └── main.jsx             # Entry point
├── public/                   # Static assets
├── context.md               # This file
└── package.json
```

## Features & Functionality

### Phase 1: Foundation (Current)
- [x] Project initialization with Vite + React
- [x] Dependencies installed (R3F, Drei, Router, etc.)
- [x] Folder structure created
- [ ] Basic 3D scene with React Three Fiber
- [ ] Simple planet spheres in space
- [ ] Camera setup with OrbitControls

### Phase 2: Interaction
- [ ] Click handlers for planets
- [ ] Smooth camera transitions between planets
- [ ] Arrow key navigation (left/right to cycle planets)
- [ ] Hover effects on planets
- [ ] Active planet highlighting

### Phase 3: Navigation & Content
- [ ] Bottom-left navigation menu component
- [ ] Page overlay/modal system
- [ ] Route integration with React Router
- [ ] Transition animations between galaxy and content
- [ ] Close/back to galaxy functionality

### Phase 4: Visual Polish
- [ ] Sci-fi typography implementation
- [ ] Color palette application
- [ ] Glassmorphism UI effects
- [ ] Particle systems and starfield
- [ ] Bloom/glow post-processing effects
- [ ] Planet visual variations (colors, sizes, rings, etc.)

### Phase 5: Content & Optimization
- [ ] Add actual case study content
- [ ] About me page content
- [ ] Resume link setup
- [ ] Social media icons
- [ ] Performance optimization (lazy loading, LOD)
- [ ] Mobile responsiveness
- [ ] Loading screen

### Phase 6: Deployment
- [ ] Build optimization
- [ ] GitHub repository setup
- [ ] GitHub Pages or Vercel deployment
- [ ] Custom domain (optional)

## Design Specifications

### Color Palette
```css
/* Background */
--space-dark: #0a0e27;
--space-medium: #1a1d3a;

/* Accents */
--electric-blue: #00d4ff;
--neon-purple: #a855f7;
--cyan: #22d3ee;
--pink: #ec4899;

/* UI Elements */
--glass-white: rgba(255, 255, 255, 0.1);
--glass-border: rgba(255, 255, 255, 0.2);
--text-primary: #ffffff;
--text-secondary: rgba(255, 255, 255, 0.7);
```

### Typography
- **Headings:** Orbitron, Exo 2, Audiowide, or Michroma
- **Body:** Inter, Space Grotesk, or DM Sans
- **Monospace (optional):** JetBrains Mono, Fira Code

### Navigation Structure
1. **Home** - Galaxy view (default)
2. **Case Study 1** - Planet 1
3. **Case Study 2** - Planet 2
4. **Case Study 3** - Planet 3
5. **About Me** - Planet 4
6. **Resume** - External link/download
7. **Social Links** - Icons in navigation

## Galaxy Layout Concept

```
        Case Study 2
             🪐

  About Me              Case Study 1
     🌍        ⭐          🌕
                HOME
              (Center)
                        Case Study 3
         🪐                💫

```

**Planet Mapping:**
- **Central Star:** Home/Return point
- **Planet 1:** Primary case study (largest)
- **Planet 2:** Second case study
- **Planet 3:** Third case study
- **Planet 4:** About me (personal, Earth-like)
- **Satellites/Moons:** Social links (optional)

## Navigation Mechanics

### Camera System
- **Default View:** Wide shot showing all planets
- **Orbit Controls:** User can rotate, zoom, pan
- **Smooth Transitions:** GSAP or R3F's useSpring for camera animations
- **Focus State:** Camera moves to selected planet, dims others

### User Interactions
1. **Click Planet:** Camera zooms to planet → Overlay appears with content
2. **Arrow Keys:** Cycle through planets (left/right)
3. **Bottom Nav Click:** Direct navigation to any section
4. **ESC Key:** Close overlay and return to galaxy view
5. **Mobile:** Touch controls for orbit, tap planets

## Content Strategy

### Case Studies
Each case study should include:
- Project title and role
- Company/client name
- Project overview (2-3 sentences)
- Challenge statement
- Solution approach
- Key images/mockups
- Results/impact
- Tech stack or tools used

### About Me Page
- Professional headshot
- Bio (2-3 paragraphs)
- Skills & expertise
- Design philosophy
- Contact information
- Downloadable resume link

## Performance Targets

- **FPS:** Maintain 60fps in galaxy view
- **Load Time:** < 3 seconds initial load
- **Interactivity:** < 100ms response to clicks
- **Mobile:** Graceful degradation on lower-end devices

## Development Notes

### Current Setup Issues
- Node.js installed via Homebrew at `/opt/homebrew/Cellar/node/25.3.0/`
- Need to set PATH in terminal: `export PATH="/opt/homebrew/Cellar/node/25.3.0/bin:$PATH"`
- This PATH export needed for all npm/node commands

### Code Style Guidelines
- Use functional components with hooks
- Keep components small and focused
- Separate 3D logic from UI logic
- Use meaningful component and variable names
- Comment complex 3D math or algorithms
- Follow React Three Fiber best practices (avoid creating objects in render)

### Git Strategy
- Main branch for production-ready code
- Feature branches for new sections
- Commit frequently with clear messages
- Tag releases for milestones

## Accessibility Considerations

- Keyboard navigation for all interactive elements
- ARIA labels on clickable planets
- Focus indicators for keyboard users
- Option to disable animations (prefers-reduced-motion)
- High contrast text for readability
- Alt text for images in case studies

## Future Enhancements (Post-MVP)

- [ ] Sound effects for interactions (optional toggle)
- [ ] Parallax effects in content overlays
- [ ] Custom 3D models instead of basic spheres
- [ ] Dynamic planet shaders
- [ ] Easter eggs (hidden planets, constellations)
- [ ] Blog section
- [ ] Contact form
- [ ] Analytics integration
- [ ] SEO optimization
- [ ] PWA capabilities

## Resources & References

### Documentation
- [React Three Fiber Docs](https://docs.pmnd.rs/react-three-fiber)
- [Three.js Docs](https://threejs.org/docs/)
- [Drei Helpers](https://github.com/pmndrs/drei)
- [Framer Motion](https://www.framer.com/motion/)

### Inspiration
- Space exploration websites
- Sci-fi UI designs
- Portfolio sites with unique navigation
- Planetarium interfaces

## Team & Roles

- **Product Designer:** [Your Name] - Vision, design decisions, content
- **Developer:** Claude (AI Assistant) - Implementation, technical decisions, coding

---

**Note:** This document is a living file that should be updated as the project evolves. Any major decisions, architecture changes, or new features should be documented here for future reference.
