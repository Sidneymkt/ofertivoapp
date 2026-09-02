/**
 * Regras de validade das ofertas.
 * Uma oferta não pode ter validade superior a 1 mês (30 dias) a partir de agora.
 */

export const MAX_OFFER_DAYS = 30;

/** Ofertas relâmpago são definidas em horas (máx. 72h). */
export const FLASH_MAX_HOURS = 72;
export const FLASH_HOUR_PRESETS = [1, 2, 3, 6, 12, 24, 48, 72];


const toLocalInputValue = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** Valor mínimo para o input datetime-local (agora). */
export const getMinValidUntil = () => toLocalInputValue(new Date());

/** Valor máximo para o input datetime-local (agora + 30 dias). */
export const getMaxValidUntil = () => {
  const d = new Date();
  d.setDate(d.getDate() + MAX_OFFER_DAYS);
  return toLocalInputValue(d);
};

/**
 * Garante que a data escolhida respeite o limite máximo de 30 dias.
 * Retorna a data ajustada (clamped) em formato datetime-local.
 */
export const clampValidUntil = (value: string) => {
  if (!value) return value;
  const max = getMaxValidUntil();
  return value > max ? max : value;
};

/** Verifica se a data está dentro do limite permitido. */
export const isValidUntilWithinLimit = (value: string) => {
  if (!value) return true;
  return value <= getMaxValidUntil();
};

/** Converte uma duração em horas (relâmpago) para o valor do input datetime-local. */
export const hoursToValidUntil = (hours: number | string) => {
  const h = Number(hours);
  if (!h || Number.isNaN(h) || h <= 0) return '';
  const capped = Math.min(h, FLASH_MAX_HOURS);
  const d = new Date();
  d.setMinutes(d.getMinutes() + Math.round(capped * 60));
  return toLocalInputValue(d);
};
