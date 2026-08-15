import { useEffect, useState } from 'react';
import { Changelog } from './components/Changelog';
import { APP_VERSION } from './data/changelog';
import { ArmyCalculator } from './pages/ArmyCalculator';
import { OperationPlanner } from './pages/OperationPlanner';
import { UnitAttributes } from './pages/UnitAttributes';

interface Tool {
  key: string;
  name: string;
  icon: string;
  blurb: string;
  footer: string;
  render: () => JSX.Element;
}

const TOOLS: Tool[] = [
  {
    key: 'units',
    name: 'Unit Attributes',
    icon: '⚔️',
    blurb:
      'Rank every unit by whatever actually constrains you — resources, grain, or the hours in a day.',
    footer:
      'Training times here assume a level-20 training building. Use the Army Calculator to model real building levels.',
    render: () => <UnitAttributes />,
  },
  {
    key: 'army',
    name: 'Army Calculator',
    icon: '🏰',
    blurb:
      'Set your training buildings running for a stretch of time and see the army that comes out, what it costs, and what it is worth in a fight.',
    footer:
      'Queues run in parallel and produce whole units only. Great Barracks and Great Stable charge triple.',
    render: () => <ArmyCalculator />,
  },
  {
    key: 'operations',
    name: 'Operation Planner',
    icon: '🗺️',
    blurb:
      'Coordinate attackers and targets around troop speed, distance, long-range bonuses, and both players’ protected hours.',
    footer:
      'Travel uses the slowest troop in each army. Bannerfield adds 20% speed per level to the part of a journey beyond 20 fields.',
    render: () => <OperationPlanner />,
  },
];

const readTool = (): string => {
  const key = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('tool');
  return TOOLS.some((t) => t.key === key) ? key! : TOOLS[0].key;
};

export default function App() {
  const [toolKey, setToolKey] = useState(readTool);
  const [showChangelog, setShowChangelog] = useState(false);

  // Each tool owns its own slice of the fragment, so switching tools clears
  // the previous tool's parameters rather than leaving them to be misread.
  const select = (key: string) => {
    if (key === toolKey) return;
    window.history.replaceState(null, '', `${window.location.pathname}#tool=${key}`);
    setToolKey(key);
  };

  useEffect(() => {
    const onPop = () => setToolKey(readTool());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const tool = TOOLS.find((t) => t.key === toolKey) ?? TOOLS[0];

  return (
    <div className="app">
      <header className="app__header">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">⌬</span>
          <div>
            <span className="brand__name">
              Thronewake Tools
              <button
                type="button"
                className="brand__version"
                onClick={() => setShowChangelog(true)}
                title="View changelog"
              >
                v{APP_VERSION}
              </button>
            </span>
            <span className="brand__tool">{tool.name}</span>
          </div>
        </div>

        <nav className="toolbar" aria-label="Tools">
          {TOOLS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`pill pill--tool ${t.key === toolKey ? 'is-active' : ''}`}
              aria-current={t.key === toolKey ? 'page' : undefined}
              aria-label={t.name}
              onClick={() => select(t.key)}
            >
              <span className="pill__emoji" aria-hidden="true">{t.icon}</span>
              {t.name}
            </button>
          ))}
        </nav>

        <p className="app__blurb">
          {tool.blurb} Runs entirely in your browser; the link in your address bar
          carries your settings.
        </p>
      </header>

      {/* Remounting on tool change keeps each tool's URL state hook isolated. */}
      <div key={tool.key}>{tool.render()}</div>

      <footer className="app__footer">
        <p>
          Unit names, stats, costs and training times are taken from the live game
          data. {tool.footer}
        </p>
      </footer>

      {showChangelog && <Changelog onClose={() => setShowChangelog(false)} />}
    </div>
  );
}
