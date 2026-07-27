
import { useState } from 'react';

// Máscaras simplificadas e seguras
export const applyPhoneMask = (value: string) => {
  const v = value.replace(/\D/g, '').slice(0, 11);
  if (v.length <= 10) {
    // (99) 9999-9999
    if (v.length > 6) return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6, 10)}`;
    if (v.length > 2) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
    return v ? `(${v}` : "";
  }
  // (99) 99999-9999
  return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7, 11)}`;
};

// WhatsApp é sempre celular com 11 dígitos: (99) 99999-9999
export const applyWhatsappMask = (value: string) => {
  const v = value.replace(/\D/g, '').slice(0, 11);
  if (v.length > 7) return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7, 11)}`;
  if (v.length > 2) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  return v ? `(${v}` : "";
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

export const applyCepMask = (value: string) => {
  const d = String(value || '').replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};

const applyMask = (mask: string, val: string) => {
  if (mask === 'phone') return applyPhoneMask(val);
  if (mask === 'whatsapp') return applyWhatsappMask(val);
  if (mask === 'cep') return applyCepMask(val);
  return applyCnpjCpfMask(val);
};

export const MaskedInput = ({ value, onChange, mask, placeholder, ...props }: any) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(applyMask(mask, e.target.value));
  };
  // Normaliza o valor exibido (corrige dados legados salvos com máscara antiga)
  const display = value ? applyMask(mask, String(value)) : '';
  return <input value={display} onChange={handleChange} placeholder={placeholder} inputMode={mask === 'phone' || mask === 'whatsapp' || mask === 'cep' || mask === 'cnpj' ? 'numeric' : undefined} {...props} />;
};

