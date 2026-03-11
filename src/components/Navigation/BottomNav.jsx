import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Banana, LayoutDashboard, MessageSquare, User, FlaskConical, FileText, Menu, X, Linkedin, Dribbble, Github, Orbit, Trash2 } from 'lucide-react';
import './BottomNav.css';
import { planetsData } from '../../data/planets';
import { aboutContent } from '../../data/caseStudies';
import { isTouchDevice } from '../../utils/isTouchDevice';
import { playMenuClick, playMenuHover } from '../../utils/sounds';

// Check touch once on module load
const isTouch = isTouchDevice();

const BottomNav = forwardRef(function BottomNav({ activePlanetId, onNavigate, onCreatePlanet, onDeletePlanet, hasCustomPlanet = false, onExpandChange }, ref) {
  const [isExpanded, setIsExpanded] = useState(false);

  useImperativeHandle(ref, () => ({
    openNav() { handleToggle(true); },
  }));

  // Notify parent when expanded state changes
  const handleToggle = (expanded) => {
    setIsExpanded(expanded);
    onExpandChange?.(expanded);
  };

  // Keyboard shortcut: 'm' to toggle menu
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'm' || e.key === 'M') {
        // Don't trigger if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        handleToggle(!isExpanded);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  const navItems = [
    { id: 'case-study-1', label: 'Banana Phone', icon: <Banana size={18} /> },
    { id: 'case-study-2', label: 'Consumer Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'case-study-3', label: 'AI Texting', icon: <MessageSquare size={18} /> },
    { id: 'about', label: 'About', icon: <User size={18} /> },
    { id: 'experiments', label: 'ERR_X.0', icon: <FlaskConical size={18} /> },
  ];

  const socialLinks = [
    { name: 'LinkedIn', url: aboutContent.social.linkedin, icon: <Linkedin size={16} /> },
    { name: 'Dribbble', url: aboutContent.social.dribbble, icon: <Dribbble size={16} /> },
    { name: 'GitHub', url: 'https://github.com/Nyarlat-hotep', icon: <Github size={16} /> },
  ];

  const handleNavClick = (itemId) => {
    const planet = planetsData.find(p => p.id === itemId);
    onNavigate?.(planet || { id: itemId, name: itemId, color: '#6b2fa0' });
  };

  return (
    <nav className="bottom-nav">
      {/* Nav panel — collapses when closed, expands above toolbar */}
      <div className="nav-main">
        <div className="nav-main-inner">
        <ul id="nav-list" className={`nav-list ${isExpanded ? 'expanded' : ''}`} role="menu">
          {navItems.map((item) => {
            const isActive = activePlanetId === item.id;
            return (
              <li key={item.id} className="nav-item" role="none">
                <button
                  className={`nav-button ${isActive ? 'active' : ''}`}
                  onClick={() => { playMenuClick(); handleNavClick(item.id); }}
                  onMouseEnter={playMenuClick}
                  role="menuitem"
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                  {isActive && <span className="nav-indicator"></span>}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Resume Link */}
        <div className="nav-resume">
          <a
            href={aboutContent.resumeUrl}
            className="nav-button resume-button"
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={playMenuClick}
          >
            <span className="nav-icon"><FileText size={18} /></span>
            <span className="nav-label">Resume</span>
          </a>
        </div>
        </div>
      </div>

      {/* Toolbar row — always visible */}
      <div className="nav-toolbar">
        {/* Menu toggle — dark container matching social group */}
        <div className="nav-toggle-container">
          <button
            className="nav-toggle"
            onClick={() => { playMenuClick(); handleToggle(!isExpanded); }}
            onMouseEnter={playMenuClick}
            aria-label={isExpanded ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isExpanded}
            aria-controls="nav-list"
          >
            <span className="nav-toggle-icon">{isExpanded ? <X size={20} /> : <Menu size={20} />}</span>
            {!isTouch && (
              <span className="nav-tooltip">
                <span className="tooltip-key">Press m</span>
              </span>
            )}
          </button>
        </div>

        {/* Social links */}
        <div className="nav-social">
          {socialLinks.map((social) => (
            <a
              key={social.name}
              href={social.url}
              className="social-link"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.name}
              title={social.name}
              onMouseEnter={playMenuClick}
            >
              {social.icon}
            </a>
          ))}
        </div>

        {/* Create/Delete Planet Button */}
        <div className="nav-social">
          <a
            className={`social-link create-planet-btn ${hasCustomPlanet ? 'delete-mode' : ''}`}
            onClick={() => hasCustomPlanet ? onDeletePlanet?.() : onCreatePlanet?.()}
            onMouseEnter={playMenuClick}
            aria-label={hasCustomPlanet ? "Delete your planet" : "Create your own planet"}
            title={hasCustomPlanet ? "Delete planet" : "Create your planet"}
            role="button"
            tabIndex={0}
          >
            {hasCustomPlanet ? <Trash2 size={16} /> : <Orbit size={16} />}
          </a>
        </div>
      </div>
    </nav>
  );
});

export default BottomNav;
