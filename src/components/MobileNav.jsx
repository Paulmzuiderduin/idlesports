import { Icon } from './Icon.jsx';

const tabs = [
  { id: 'play', label: 'Play', icon: 'play' },
  { id: 'upgrades', label: 'Upgrades', icon: 'spark' },
  { id: 'legacy', label: 'Legacy', icon: 'legacy' },
  { id: 'stats', label: 'Stats', icon: 'chart' }
];

export const MobileNav = ({ activeTab, onChange }) => (
  <nav className="mobile-nav" aria-label="Game sections">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        className={`mobile-nav-button ${activeTab === tab.id ? 'active' : ''}`}
        onClick={() => onChange(tab.id)}
        aria-current={activeTab === tab.id ? 'page' : undefined}
      >
        <Icon name={tab.icon} size={20} />
        <span>{tab.label}</span>
      </button>
    ))}
  </nav>
);
