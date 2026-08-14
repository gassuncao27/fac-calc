import { useEffect, useState, type InputHTMLAttributes } from 'react';
import { inputClass } from '../ui/Field';
import { formatNumber, parseLocaleNumber } from '../../utils/format';

interface PercentInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  /** Percentual (3 = 3%) ou null quando vazio */
  value: number | null;
  onChangeValue: (value: number | null) => void;
  digits?: number;
}

function displayText(value: number | null, digits: number): string {
  return value === null ? '' : `${formatNumber(value, digits)}%`;
}

function editableText(value: number | null): string {
  if (value === null) return '';
  return String(value).replace('.', ',');
}

/**
 * Campo percentual: o usuário digita "3" e o campo representa 3,00%.
 * Nunca exige "0,03" — a conversão para fração é interna ao motor.
 */
export function PercentInput({ value, onChangeValue, digits = 2, className = '', ...rest }: PercentInputProps) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!focused) setText(displayText(value, digits));
  }, [value, focused, digits]);

  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={text}
      placeholder={rest.placeholder ?? '0,00%'}
      className={`${inputClass} tabular text-right ${className}`}
      onFocus={(e) => {
        setFocused(true);
        setText(editableText(value));
        requestAnimationFrame(() => e.target.select());
      }}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        onChangeValue(raw.trim() === '' ? null : parseLocaleNumber(raw));
      }}
      onBlur={() => {
        setFocused(false);
        setText(displayText(value, digits));
      }}
    />
  );
}
