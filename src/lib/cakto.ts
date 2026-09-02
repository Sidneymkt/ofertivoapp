/**
 * Configuração de checkouts Cakto
 * Sistema unificado de pagamento para planos do Ofertivo
 */

export const CAKTO_CHECKOUTS = {
  'Start': 'https://pay.cakto.com.br/zy75ori_637874',
  'Essencial': 'https://pay.cakto.com.br/y3enqsu_637943',
  'Pro': 'https://pay.cakto.com.br/zh3ga58_637952',
  'Premium': 'https://pay.cakto.com.br/fr37p4h_637958',
} as const;

export type CaktoPlanName = keyof typeof CAKTO_CHECKOUTS;

/**
 * Abre o checkout da Cakto para o plano especificado
 */
export const openCaktoCheckout = (planName: string) => {
  const checkoutUrl = CAKTO_CHECKOUTS[planName as CaktoPlanName];
  
  if (!checkoutUrl) {
    console.error(`Plano não encontrado: ${planName}`);
    return false;
  }

  window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
  return true;
};
