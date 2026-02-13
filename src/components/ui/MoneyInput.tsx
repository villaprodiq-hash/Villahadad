import React, { useState, useEffect } from 'react';

interface MoneyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  label?: string;
}

export const MoneyInput: React.FC<MoneyInputProps> = ({
  value,
  onChange,
  placeholder = '0',
  className = '',
  label,
}) => {
  const [displayValue, setDisplayValue] = useState('');

  const parseArabic = (str: string) =>
    str.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
  const formatNum = (n: number | string) => (n === 0 || n === '0' ? '0' : (n ? Number(n).toLocaleString('en-US') : ''));
  const formatNumWithoutCommas = (n: number | string) => (n === 0 || n === '0' ? '0' : (n ? Number(n).toLocaleString('en-US').replace(/,/g, '') : ''));

  useEffect(() => {
    setDisplayValue(formatNum(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseArabic(e.target.value)
      .replace(/[^0-9.,]/g, '');
    if ((raw.match(/\./g) || []).length > 1) return;

    // Remove commas and convert to number for saving
    const numValue = parseFloat(raw.replace(/,/g, ''));
    onChange(isNaN(numValue) ? 0 : numValue);

    // Display with commas
    if (raw === '' || raw.endsWith('.') || (raw.includes('.') && raw.endsWith('0'))) {
      setDisplayValue(raw);
    } else {
      setDisplayValue(formatNum(numValue));
    }
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          className={`w-full p-2 border border-gray-300 rounded-md text-left font-mono text-lg ${className}`}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">
          IQD
        </span>
      </div>
    </div>
  );
};
