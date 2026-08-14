import type { InputHTMLAttributes } from 'react';
import { inputClass } from '../ui/Field';

interface DateInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  /** yyyy-MM-dd */
  value: string;
  onChangeValue: (value: string) => void;
}

/**
 * Input de data nativo (yyyy-MM-dd interno). O navegador do aparelho
 * exibe no formato local (DD/MM/AAAA no Brasil) e abre o seletor
 * nativo no touchscreen.
 */
export function DateInput({ value, onChangeValue, className = '', ...rest }: DateInputProps) {
  return (
    <input
      {...rest}
      type="date"
      value={value}
      onChange={(e) => onChangeValue(e.target.value)}
      className={`${inputClass} ${className}`}
    />
  );
}
