import { Zap, Users, CheckCircle, Package, ShoppingCart } from 'lucide-react';

/**
 * Tipos de promoção disponíveis no sistema
 * Mantenha esta lista sincronizada em todos os formulários
 */
export const OFFER_TYPES = [
  {
    value: 'flash',
    label: 'Oferta Relâmpago',
    icon: Zap,
    description: 'Promoção por tempo limitado com grande desconto'
  },
  {
    value: 'first-use',
    label: 'Oferta para Primeiro Uso',
    icon: Users,
    description: 'Exclusiva para novos clientes'
  },
  {
    value: 'checkin',
    label: 'Check-in Premiado',
    icon: CheckCircle,
    description: 'Cliente ganha pontos ao fazer check-in'
  },
  {
    value: 'combo',
    label: 'Combo Econômico',
    icon: Package,
    description: 'Produtos ou serviços combinados com desconto'
  },
  {
    value: 'min-purchase',
    label: 'Compras Acima de Valor',
    icon: ShoppingCart,
    description: 'Desconto para compras acima de um valor mínimo'
  }
] as const;

/**
 * Converte valores antigos para os novos tipos padrão
 * Garante compatibilidade retroativa com ofertas antigas
 */
export function normalizeOfferType(type: string | null | undefined): string {
  if (!type) return 'flash';
  
  // Mapeamento de valores antigos para novos
  const typeMap: Record<string, string> = {
    'standard': 'flash',        // Oferta Padrão → Oferta Relâmpago
    'exclusive': 'first-use',   // Oferta Exclusiva → Primeiro Uso
    'first_time': 'first-use',  // Padronizar variação
  };
  
  return typeMap[type] || type;
}

/**
 * Valida se o tipo de oferta é válido
 */
export function isValidOfferType(type: string): boolean {
  return OFFER_TYPES.some(t => t.value === type);
}

/**
 * Retorna o label formatado do tipo de oferta
 */
export function getOfferTypeLabel(type: string | null | undefined): string {
  if (!type) return '🏷️ Promoção';
  
  const normalizedType = normalizeOfferType(type);
  const offerType = OFFER_TYPES.find(t => t.value === normalizedType);
  
  return offerType ? offerType.label : '🏷️ Promoção';
}

/**
 * Retorna o estilo CSS do tipo de oferta
 */
export function getOfferTypeStyle(type: string | null | undefined): string {
  if (!type) return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white';
  
  const normalizedType = normalizeOfferType(type);
  
const styles: Record<string, string> = {
    'flash': 'bg-gradient-to-r from-orange-500 to-red-600 text-white',
    'first-use': 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white',
    'checkin': 'bg-gradient-to-r from-green-500 to-emerald-600 text-white',
    'combo': 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white',
    'min-purchase': 'bg-gradient-to-r from-violet-500 to-purple-600 text-white',
  };
  
  return styles[normalizedType] || 'bg-gradient-to-r from-amber-500 to-orange-500 text-white';
}
