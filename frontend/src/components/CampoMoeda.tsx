import type { InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  /** Valor em formato decimal com ponto ("1234.56") ou "" quando vazio. */
  value: string;
  onChange: (valor: string) => void;
};

/**
 * Campo de dinheiro no padrão brasileiro: o usuário digita só números e o campo
 * monta milhar e centavos sozinho (digitar 123456 mostra 1.234,56).
 * O valor devolvido é sempre "1234.56", pronto para Number().
 */
export function CampoMoeda({ value, onChange, placeholder = "0,00", ...resto }: Props) {
  const numero = value === "" ? null : Number(String(value).replace(",", "."));
  const exibido =
    numero === null || Number.isNaN(numero)
      ? ""
      : numero.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <input
      {...resto}
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      value={exibido}
      onChange={(e) => {
        const digitos = e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 13);
        onChange(digitos ? (Number(digitos) / 100).toFixed(2) : "");
      }}
      onFocus={(e) => {
        // Cursor sempre no fim, já que a digitação entra pela direita.
        const alvo = e.target;
        requestAnimationFrame(() => alvo.setSelectionRange(alvo.value.length, alvo.value.length));
        resto.onFocus?.(e);
      }}
      style={{ fontVariantNumeric: "tabular-nums", ...resto.style }}
    />
  );
}
