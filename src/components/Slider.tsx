import { statIcon } from '../icons';

interface Props {
  id: string;
  label: string;
  hint: string;
  value: number;
  /** Normal in-game level cap, used by the middle shortcut. */
  max: number;
  /** Higher cap available once the relevant research is complete. */
  researchMax?: number;
  onChange: (value: number) => void;
  /** Icon file basename in `src/assets/icons/stats/`. */
  iconKey?: string;
  /** Short faction code, shown when the building belongs to one faction. */
  badge?: string;
  badgeColor?: string;
  badgeTitle?: string;
}

/** A level slider with min/max shortcuts, used for building levels. */
export function Slider({
  id,
  label,
  hint,
  value,
  max,
  researchMax,
  onChange,
  iconKey,
  badge,
  badgeColor,
  badgeTitle,
}: Props) {
  const icon = iconKey ? statIcon(iconKey) : undefined;
  const sliderMax = researchMax ?? max;

  return (
    <div className="slider">
      <label className="slider__label" htmlFor={id} title={hint}>
        {icon && <img className="stat-icon" src={icon} alt="" aria-hidden="true" />}
        {label}
        {badge && (
          <span
            className="faction-badge"
            style={{ '--faction-color': badgeColor } as React.CSSProperties}
            title={badgeTitle ? `${badgeTitle} only` : undefined}
          >
            {badge}
          </span>
        )}
        <span className="slider__value">{value}</span>
      </label>
      <div className="slider__row">
        <button type="button" className="pill pill--tiny" onClick={() => onChange(0)}>
          0
        </button>
        <input
          id={id}
          type="range"
          min={0}
          max={sliderMax}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <button type="button" className="pill pill--tiny" onClick={() => onChange(max)}>
          {max}
        </button>
        {researchMax && researchMax > max && (
          <button
            type="button"
            className="pill pill--tiny"
            onClick={() => onChange(researchMax)}
            title="Maximum level with research"
          >
            {researchMax}
          </button>
        )}
      </div>
    </div>
  );
}
