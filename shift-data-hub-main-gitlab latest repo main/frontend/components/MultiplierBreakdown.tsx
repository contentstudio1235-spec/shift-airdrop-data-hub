'use client';

import { useState } from 'react';

interface MultiplierComponent {
  name: string;
  value: number;
  icon: string;
  color: string;
}

interface Props {
  baseMultiplier: number;
  components?: MultiplierComponent[];
}

export function MultiplierBreakdown({ baseMultiplier, components }: Props) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Default components if not provided
  const defaultComponents: MultiplierComponent[] = [
    { name: 'Base', value: 1.0, icon: '📊', color: '#64748b' },
    { name: 'Token Bonus', value: 0.25, icon: '💎', color: '#3b82f6' },
    { name: 'Streak Bonus', value: 0.1, icon: '🔥', color: '#ef4444' },
    { name: 'KOL Referral', value: 0.5, icon: '⭐', color: '#f59e0b' },
    { name: 'Badge Bonus', value: 0.5, icon: '🏆', color: '#8b5cf6' },
  ];

  const multiplierComponents = components || defaultComponents;
  const totalCalculated = multiplierComponents.reduce((sum, comp) => sum + comp.value, 0);

  return (
    <div className="multiplier-container">
      <div className="multiplier-display">
        <span className="multiplier-label">XP Multiplier</span>
        <div className="multiplier-badge">
          <span className="multiplier-value">{baseMultiplier.toFixed(2)}x</span>
          <button
            className="info-button"
            onClick={() => setShowTooltip(!showTooltip)}
            title="Click to see breakdown"
          >
            ℹ️
          </button>
        </div>
      </div>

      {showTooltip && (
        <div className="tooltip">
          <div className="tooltip-header">
            <span>Multiplier Breakdown</span>
            <button
              className="close-button"
              onClick={() => setShowTooltip(false)}
            >
              ✕
            </button>
          </div>

          <div className="components-list">
            {multiplierComponents.map((comp, idx) => (
              <div key={idx} className="component-row">
                <div className="component-label">
                  <span className="component-icon">{comp.icon}</span>
                  <span className="component-name">{comp.name}</span>
                </div>
                <span
                  className="component-value"
                  style={{ color: comp.color }}
                >
                  +{comp.value.toFixed(2)}x
                </span>
              </div>
            ))}
          </div>

          <div className="tooltip-total">
            <span>Total Multiplier</span>
            <span className="total-value">{totalCalculated.toFixed(2)}x</span>
          </div>

          <div className="tooltip-note">
            <p>Your XP earnings are multiplied by this value.</p>
            <p>Complete badges, hold longer, and refer friends to increase it!</p>
          </div>
        </div>
      )}

      <style jsx>{`
        .multiplier-container {
          position: relative;
        }

        .multiplier-display {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: center;
        }

        .multiplier-label {
          font-size: 0.85em;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }

        .multiplier-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid rgba(147, 51, 234, 0.5);
        }

        .multiplier-value {
          font-size: 1.5em;
          font-weight: 700;
          color: #fff;
        }

        .info-button {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 0.9em;
          transition: all 0.2s;
        }

        .info-button:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .tooltip {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 8px;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 16px;
          width: 300px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
          z-index: 1000;
        }

        .tooltip-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          font-weight: 600;
          color: #f1f5f9;
        }

        .close-button {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          font-size: 1.2em;
          transition: color 0.2s;
        }

        .close-button:hover {
          color: #f1f5f9;
        }

        .components-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 12px;
          border-top: 1px solid #334155;
          border-bottom: 1px solid #334155;
          padding: 12px 0;
        }

        .component-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .component-label {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .component-icon {
          font-size: 1.1em;
        }

        .component-name {
          color: #cbd5e1;
          font-size: 0.9em;
        }

        .component-value {
          font-weight: 600;
          font-size: 0.95em;
        }

        .tooltip-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding: 8px 0;
          font-weight: 600;
        }

        .total-value {
          color: #10b981;
          font-size: 1.1em;
        }

        .tooltip-note {
          font-size: 0.8em;
          color: #94a3b8;
          line-height: 1.4;
        }

        .tooltip-note p {
          margin: 0;
        }

        .tooltip-note p:not(:last-child) {
          margin-bottom: 6px;
        }

        @media (max-width: 640px) {
          .tooltip {
            position: fixed;
            top: auto;
            right: auto;
            left: 50%;
            bottom: 20px;
            transform: translateX(-50%);
            width: calc(100% - 40px);
          }
        }
      `}</style>
    </div>
  );
}
