import { useEffect, useState } from 'react';
import { Changelog } from './components/Changelog';
import { APP_VERSION } from './data/changelog';
import { ArmyCalculator } from './pages/ArmyCalculator';
import { BuildingStats } from './pages/BuildingStats';
import { CpOptimizer } from './pages/CpOptimizer';
import { OperationPlanner } from './pages/OperationPlanner';
import { UnitAttributes } from './pages/UnitAttributes';

interface Tool {
  key: string;
  name: string;
  icon: string;
  blurb: string;
  footer: string;
  render: (v2Unlocked?: boolean) => JSX.Element;
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
    render: (v2) => <OperationPlanner isV2Unlocked={v2} />,
  },
  {
    key: 'optimizer',
    name: 'CP Optimizer',
    icon: '🏛️',
    blurb:
      'Compute the cheapest, mathematically optimal building upgrade sequence to maximize Culture Points per resource spent.',
    footer:
      'Culture Point calculations factor in building levels, resource field averages, city bonuses, and slot constraints.',
    render: () => <CpOptimizer />,
  },
  {
    key: 'buildings',
    name: 'Building Stats',
    icon: '📖',
    blurb:
      'Explore detailed stats, resource upgrade costs, culture points, construction times, and building effects across all levels 1–22.',
    footer:
      'Building stats and construction time formulas reflect live game data, Main Building speed scaling, and City level 22 maximums.',
    render: () => <BuildingStats />,
  },
];

const readTool = (): string => {
  const key = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('tool');
  if (key === 'cp-optimizer') return 'optimizer';
  if (key === 'building-stats' || key === 'catalog') return 'buildings';
  return TOOLS.some((t) => t.key === key) ? key! : TOOLS[0].key;
};

export default function App() {
  const [toolKey, setToolKey] = useState(readTool);
  const [showChangelog, setShowChangelog] = useState(false);
  const [v2Unlocked, setV2Unlocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem('thronewake.v2.unlocked') === '1';
    } catch {
      return false;
    }
  });
  const [opClickCount, setOpClickCount] = useState<number>(0);
  const [secretToast, setSecretToast] = useState<string | null>(null);

  // Each tool owns its own slice of the fragment, so switching tools clears
  // the previous tool's parameters rather than leaving them to be misread.
  const select = (key: string) => {
    if (key === toolKey) return;
    window.history.replaceState(null, '', `${window.location.pathname}#tool=${key}`);
    setToolKey(key);
  };

  const handleToolClick = (key: string) => {
    if (key === 'operations') {
      const nextCount = opClickCount + 1;
      if (nextCount >= 10) {
        setOpClickCount(0);
        setV2Unlocked((curr) => {
          const nextState = !curr;
          try {
            localStorage.setItem('thronewake.v2.unlocked', nextState ? '1' : '0');
          } catch {}
          setSecretToast(
            nextState
              ? '🕵️ Top Secret Unlocked: Operation Planner v2 (Team Rooms & Multi-Ops) Active!'
              : '🔒 Operation Planner v2 Locked (Reverted to standard v1)'
          );
          setTimeout(() => setSecretToast(null), 4000);
          return nextState;
        });
      } else {
        setOpClickCount(nextCount);
      }
    } else {
      setOpClickCount(0);
    }
    select(key);
  };

  useEffect(() => {
    const onHash = () => setToolKey(readTool());
    window.addEventListener('hashchange', onHash);
    window.addEventListener('popstate', onHash);
    return () => {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('popstate', onHash);
    };
  }, []);

  const tool = TOOLS.find((t) => t.key === toolKey) ?? TOOLS[0];

  useEffect(() => {
    document.title = `Thronewake Tools — ${tool.name}${tool.key === 'operations' && v2Unlocked ? ' (v2 Secret)' : ''}`;
  }, [tool.name, tool.key, v2Unlocked]);

  return (
    <div className="app">
      {secretToast && (
        <div className="secret-toast" role="status" aria-live="polite">
          {secretToast}
        </div>
      )}

      <header className="app__header">
        <div className="app__header-top">
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
              <span className="brand__tool">
                {tool.name}
                {tool.key === 'operations' && v2Unlocked && (
                  <span className="secret-badge-tag" title="Top Secret Mode is Active. Click 10x on tab to re-lock.">
                    🕵️ v2 Secret
                  </span>
                )}
              </span>
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
                onClick={() => handleToolClick(t.key)}
              >
                <span className="pill__emoji" aria-hidden="true">{t.icon}</span>
                {t.name}
              </button>
            ))}
          </nav>
        </div>

        <p className="app__blurb">
          {tool.blurb} Runs entirely in your browser; the link in your address bar
          carries your settings.
        </p>
      </header>

      {/* Remounting on tool change keeps each tool's URL state hook isolated. */}
      <div key={`${tool.key}-${tool.key === 'operations' ? String(v2Unlocked) : 'static'}`}>
        {tool.render(v2Unlocked)}
      </div>

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
