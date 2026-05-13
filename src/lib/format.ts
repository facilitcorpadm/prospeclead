// Flag global: enquanto a regra de comissionamento não está definitiva,
// todos os valores monetários do app são exibidos como "—".
// Para reativar a exibição real, mude SHOW_MONEY para true.
export const SHOW_MONEY = false;

const formatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const formatBRL = (v: number | null | undefined) => {
  if (!SHOW_MONEY) return "—";
  return formatter.format(Number(v ?? 0));
};

// Versão que sempre formata (use só onde realmente precisa do número, ex: validações)
export const formatBRLAlways = (v: number | null | undefined) =>
  formatter.format(Number(v ?? 0));
