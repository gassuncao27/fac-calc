import { useEffect, useState, type InputHTMLAttributes } from 'react';
import { inputClass } from '../ui/Field';
import { formatCents, formatNumber, parseCurrencyToCents } from '../../utils/format';

interface CurrencyInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  /** Valor em centavos (null = vazio) */
  valueCents: number | null;
  onChangeCents: (cents: number | null) => void;
}

/** Texto simples para edição: 10.000,50 → "10000,50"; 10.000,00 → "10000" */
function editableText(cents: number | null): string {
  if (cents === null) return '';
  const value = cents / 100;
  if (Number.isInteger(value)) return String(value);
  return formatNumber(value, 2).replace(/\./g, '');
}

/**
 * Campo monetário com digitação natural: "10000" → R$ 10.000,00.
 * Enquanto focado mostra o texto cru para edição rápida; ao sair,
 * formata em padrão brasileiro. Propaga o valor a cada tecla para
 * manter o cálculo em tempo real.
 */
export function CurrencyInput({ valueCents, onChangeCents, className = '', ...rest }: CurrencyInputProps) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!focused) {
      setText(valueCents === null ? '' : formatCents(valueCents));
    }
  }, [valueCents, focused]);

  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={text}
      placeholder={rest.placeholder ?? 'R$ 0,00'}
      className={`${inputClass} tabular text-right ${className}`}
      onFocus={(e) => {
        setFocused(true);
        setText(editableText(valueCents));
        requestAnimationFrame(() => e.target.select());
      }}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        onChangeCents(raw.trim() === '' ? null : parseCurrencyToCents(raw));
      }}
      onBlur={() => {
        setFocused(false);
        setText(valueCents === null ? '' : formatCents(valueCents));
      }}
    />
  );
}
