import { useState } from 'react';

interface Props {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
  step?: number;
}

/**
 * Control táctil grande: botones +/- y el número tocable para escribir
 * directamente. Diseñado para capturar sin abrir formularios ni diálogos.
 */
export function QuantityStepper({ label, value, onChange, disabled, step = 1 }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const current = value ?? 0;

  function commitDraft() {
    const parsed = Number(draft.replace(',', '.'));
    if (!Number.isNaN(parsed) && parsed >= 0) {
      onChange(parsed);
    }
    setEditing(false);
  }

  return (
    <div className="stepper">
      <span className="stepper-label">{label}</span>
      <div className="stepper-controls">
        <button
          type="button"
          className="stepper-btn stepper-btn--minus"
          disabled={disabled || current <= 0}
          onClick={() => onChange(Math.max(0, current - step))}
          aria-label={`Restar ${label}`}
        >
          −
        </button>

        {editing ? (
          <input
            className="stepper-input"
            type="number"
            inputMode="decimal"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitDraft();
              if (e.key === 'Escape') setEditing(false);
            }}
          />
        ) : (
          <button
            type="button"
            className="stepper-value"
            disabled={disabled}
            onClick={() => {
              setDraft(value === null ? '' : String(current));
              setEditing(true);
            }}
          >
            {value === null ? '—' : current}
          </button>
        )}

        <button
          type="button"
          className="stepper-btn stepper-btn--plus"
          disabled={disabled}
          onClick={() => onChange(current + step)}
          aria-label={`Sumar ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
