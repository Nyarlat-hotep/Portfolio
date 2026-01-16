import { useState } from 'react';
import './BottomNav.css';
import { planetsData } from '../../data/planets';
import { aboutContent } from '../../data/caseStudies';
import HexAccent from '../UI/HexAccent';

export default function BottomNav({ activePlanetId, onNavigate }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const navItems = [
    { id: 'case-study-1', label: 'Project 1', icon: '🎨' },
    { id: 'case-study-2', label: 'Project 2', icon: '💼' },
    { id: 'case-study-3', label: 'Project 3', icon: '🚀' },
    { id: 'about', label: 'About', icon: '👤' },
  ];

  const socialLinks = [
    { name: 'LinkedIn', url: aboutContent.social.linkedin, icon: 'in' },
    { name: 'Dribbble', url: aboutContent.social.dribbble, icon: 'dr' },
    { name: 'Behance', url: aboutContent.social.behance, icon: 'be' },
  ];

  const handleNavClick = (itemId) => {
    const planet = planetsData.find(p => p.id === itemId);
    if (planet) {
      onNavigate?.(planet);
    }
  };

  return (
    <nav className="bottom-nav">
      {/* Main Navigation */}
      <div className="nav-main">
        <div className="nav-header">
          <button
            className="nav-toggle"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label="Toggle navigation"
          >
            <span className="nav-toggle-icon">{isExpanded ? '×' : '☰'}</span>
          </button>
          <span className="nav-title">Navigate</span>
        </div>

        <ul className={`nav-list ${isExpanded ? 'expanded' : ''}`}>
          {navItems.map((item) => {
            const isActive = activePlanetId === item.id;
            return (
              <li key={item.id} className="nav-item">
                <button
                  className={`nav-button ${isActive ? 'active' : ''}`}
                  onClick={() => handleNavClick(item.id)}
                >
                  <HexAccent
                    size={16}
                    color={isActive ? '#00d4ff' : '#00d4ff'}
                    opacity={isActive ? 0.8 : 0.3}
                    className="nav-hex-accent"
                  />
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
          >
            <span className="nav-icon">📄</span>
            <span className="nav-label">Resume</span>
          </a>
        </div>
      </div>

      {/* Social Links */}
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
          >
            {social.icon}
          </a>
        ))}
      </div>
    </nav>
  );
}
