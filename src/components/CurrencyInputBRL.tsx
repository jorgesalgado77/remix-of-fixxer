import * as React from "react";
import { AlertCircle } from "lucide-react";
import {
  maskCurrencyBRL,
  currencyKeyDown,
  currencyFocusSelect,
  currencyPaste,
} from "@/lib/currency-brl";
import { cn } from "@/lib/utils";

interface CurrencyInputBRLProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  error?: string | null;
  accentColor?: string; // Ex.: "#00E5FF"
  containerClassName?: string;
}

/**
 * Input BRL reutilizável — prefixo R$, máscara automática, integridade de
 * paste/setas/delete e destaque inline de erro por campo.
 */
export const CurrencyInputBRL = React.forwardRef<HTMLInputElement, CurrencyInputBRLProps>(
  function CurrencyInputBRL(
    {
      value,
      onChange,
      label,
      error,
      accentColor = "#00E5FF",
      className,
      containerClassName,
      placeholder = "0,00",
      ...rest
    },
    ref,
  ) {
    const hasError = Boolean(error);
    return (
      <div className={cn("space-y-1", containerClassName)}>
        {label && (
          <label className="block text-[10px] uppercase tracking-widest font-black text-white/60">
            {label}
          </label>
        )}
        <div className="relative">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-black text-white/60 pointer-events-none"
            aria-hidden
          >
            R$
          </span>
          <input
            ref={ref}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(maskCurrencyBRL(e.target.value))}
            onBlur={(e) => onChange(maskCurrencyBRL(e.target.value))}
            onKeyDown={currencyKeyDown}
            onFocus={currencyFocusSelect}
            onPaste={currencyPaste(onChange)}
            aria-invalid={hasError || undefined}
            aria-describedby={hasError ? `${rest.id || "cur"}-err` : undefined}
            className={cn(
              "w-full rounded-xl px-3 py-2.5 pl-10 text-sm text-white outline-none transition-colors bg-[#0A0A0B]",
              hasError
                ? "border border-red-500/70 focus:border-red-500 shadow-[0_0_0_2px_rgba(239,68,68,0.15)]"
                : "border border-white/10 focus:border-white/30",
              className,
            )}
            style={
              !hasError && accentColor
                ? ({ ["--tw-ring-color" as any]: accentColor } as React.CSSProperties)
                : undefined
            }
            {...rest}
          />
        </div>
        {hasError && (
          <div
            id={`${rest.id || "cur"}-err`}
            role="alert"
            className="flex items-center gap-1 text-[11px] font-semibold text-red-400"
          >
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  },
);
