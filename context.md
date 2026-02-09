# Product Designer Portfolio - Project Context

**Last Updated:** 2026-01-15 (Evening - MVP Complete)

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

### Phase 1: Foundation ✅ COMPLETE
- [x] Project initialization with Vite + React
- [x] Dependencies installed (R3F, Drei, Router, etc.)
- [x] Folder structure created
- [x] Basic 3D scene with React Three Fiber
- [x] Simple planet spheres in space
- [x] Camera setup with OrbitControls

### Phase 2: Interaction ✅ COMPLETE
- [x] Click handlers for planets
- [x] Smooth camera transitions between planets
- [x] Arrow key navigation (left/right to cycle planets)
- [x] Hover effects on planets
- [x] Active planet highlighting

### Phase 3: Navigation & Content ✅ COMPLETE
- [x] Bottom-left navigation menu component
- [x] Page overlay/modal system
- [x] Framer Motion animations for overlays
- [x] Transition animations between galaxy and content
- [x] Close/back to galaxy functionality (ESC key + close button)
- [x] Case Study page component
- [x] About page component

### Phase 4: Visual Polish ✅ COMPLETE (MVP)
- [x] Sci-fi typography implementation
- [x] Color palette application (electric blue, purple, cyan accents)
- [x] Glassmorphism UI effects (navigation + overlays)
- [x] Particle systems and starfield
- [x] Planet visual variations (colors, sizes, emissive glow)
- [x] Cyberpunk corner accents
- [x] Custom scrollbars
- [x] Scan line animation effect
- [ ] Bloom/glow post-processing effects (optional enhancement)

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

### Visual Inspiration & Aesthetic Direction

**Target Aesthetic:** High-tech HUD/Cyberpunk/Sci-fi Interface

Based on provided reference images, the portfolio should embody:

**Key Visual Elements from References:**

1. **HUD Elements & Frames**
   - Geometric corner brackets (L-shaped accents) ✅ Implemented
   - Technical grid overlays and dotted patterns
   - Circuit board-inspired line work
   - Hexagonal shapes and geometric patterns
   - Warning/alert style frames with diagonal stripes
   - Technical readouts and data panels

2. **Color Scheme (Orange/Blue Variant)**
   - Primary: Orange/Amber (#FF8C00, #FFA500, #FFB84D) for warnings, highlights
   - Secondary: Dark background (#0a0a0a, #1a1a1a)
   - Accents: Bright cyan/blue for contrast
   - **Current Implementation:** Using cyan/blue primary (#00d4ff, #22d3ee) with purple accents
   - **Note:** Could add orange as tertiary accent for warning states or special highlights

3. **UI Component Style**
   - Technical frames with labeled sections ("WARNING", "01", "LOREM IPSUM")
   - Progress bars with circuit-like end caps
   - Layered transparent panels with technical details
   - Diagonal cut corners and beveled edges
   - Circular radar/target-style graphics
   - Line connectors between UI elements
   - Modular, panel-based layouts

4. **Typography Treatment**
   - Bold, geometric, futuristic fonts (like "FRAME FUTURE" in references)
   - Monospace/technical fonts for data readouts
   - All-caps labels for section headers
   - Glowing text effects on important elements
   - Letter spacing for readability and tech feel

5. **Effects & Details**
   - Glowing edges and light leaks
   - Scanline animations ✅ Implemented
   - Subtle grid patterns in backgrounds
   - Hazard stripes (diagonal lines)
   - Dotted borders and dashed lines
   - Inner glow/outer glow on frames
   - Opacity layers creating depth

6. **Interactive Elements Style**
   - Buttons with technical frames
   - Animated scanlines on hover
   - Glowing borders on active states
   - Corner accents that light up
   - Progress indicators with technical styling

### Current Color Palette
```css
/* Background */
--space-dark: #0a0e27;
--space-medium: #1a1d3a;

/* Primary Accents (Blue/Cyan Theme) */
--electric-blue: #00d4ff;
--neon-purple: #a855f7;
--cyan: #22d3ee;
--pink: #ec4899;

/* Potential Orange Accents (from reference) */
--warning-orange: #FF8C00;
--tech-amber: #FFA500;
--highlight-gold: #FFB84D;

/* UI Elements */
--glass-white: rgba(255, 255, 255, 0.1);
--glass-border: rgba(255, 255, 255, 0.2);
--text-primary: #ffffff;
--text-secondary: rgba(255, 255, 255, 0.7);
```

### Typography
- **Headings:** Orbitron, Exo 2, Audiowide, Michroma, or Rajdhani (geometric, futuristic)
- **Body:** Inter, Space Grotesk, DM Sans, or Rajdhani
- **Monospace/Technical:** JetBrains Mono, Fira Code, Share Tech Mono
- **Display (Special):** Consider custom tech/HUD fonts for emphasis

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

### Visual Enhancements (Based on HUD References)
- [ ] Add technical grid overlay patterns to overlays
- [ ] Implement diagonal hazard stripes for accent areas
- [ ] Create hexagonal UI elements for special highlights
- [ ] Add progress bars with circuit-style end caps
- [ ] Implement labeled section headers (e.g., "01_OVERVIEW", "02_CHALLENGE")
- [ ] Add dotted/dashed border variations
- [ ] Create radar/circular target graphics for planet selection
- [ ] Add technical line connectors between related UI elements
- [ ] Implement orange/amber accent color for warnings or CTAs
- [ ] Add more geometric shapes (hexagons, octagons) to design system
- [ ] Create modular panel system with interchangeable frames

### Interaction & Animation
- [ ] Sound effects for interactions (optional toggle)
- [ ] Parallax effects in content overlays
- [ ] Scanline hover effects on buttons
- [ ] Glowing border animations on active states
- [ ] Corner bracket light-up animations
- [ ] Typewriter effect for text reveals
- [ ] Data stream animations in backgrounds

### 3D & Visual Effects
- [ ] Custom 3D models instead of basic spheres
- [ ] Dynamic planet shaders with tech patterns
- [ ] Bloom/glow post-processing effects
- [ ] Particle trails between planets
- [ ] Holographic material effects
- [ ] Easter eggs (hidden planets, constellations)

### Content & Features
- [ ] Blog section
- [ ] Contact form with HUD styling
- [ ] Analytics integration
- [ ] SEO optimization
- [ ] PWA capabilities
- [ ] Project filtering system
- [ ] Dark/light mode toggle (HUD style switch)

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

## AI Assistant Guidelines

When handling requests, follow this decision framework:

1. **High probability of solving the request** → Go ahead and implement the solution directly
2. **Moderate probability of solving the request** → Always ask clarifying questions first to improve the probability of success
3. **Low probability of solving the request** → Do not attempt those things; discuss alternatives or limitations instead

### CSS Protection Rule

**IMPORTANT:** If the user makes manual CSS changes to any file, do NOT override or update those changes in any way unless explicitly given permission. If changes to user-modified CSS are necessary for a task, you MUST ask for approval before making any edits to that CSS.

### Commit Rule

**IMPORTANT:** Make a git commit after every change or set of related changes. Do NOT push to remote unless the user explicitly requests it.

---

**Note:** This document is a living file that should be updated as the project evolves. Any major decisions, architecture changes, or new features should be documented here for future reference.
