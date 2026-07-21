
import { useState } from 'react';

// Máscaras simplificadas e seguras
export const applyPhoneMask = (value: string) => {
  const v = value.replace(/\D/g, '');
  if (v.length <= 10) {
    // (99) 9999-9999
    if (v.length > 6) return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6, 10)}`;
    if (v.length > 2) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
    return v ? `(${v}` : "";
  } else {
    // (99) 99999-9999
    const limited = v.slice(0, 11);
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7, 11)}`;
  }
};

export const applyCnpjCpfMask = (value: string) => {
  let v = value.replace(/\D/g, '');
  if (v.length > 14) v = v.slice(0, 14);
  if (v.length > 11) return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}-${v.slice(12)}`;
  if (v.length > 8) return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`;
  if (v.length > 6) return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`;
  if (v.length > 3) return `${v.slice(0, 3)}.${v.slice(3)}`;
  return v;
};

export const MaskedInput = ({ value, onChange, mask, placeholder, ...props }: any) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const masked = mask === 'phone' ? applyPhoneMask(val) : applyCnpjCpfMask(val);
    onChange(masked);
  };
  return <input value={value} onChange={handleChange} placeholder={placeholder} {...props} />;
};
