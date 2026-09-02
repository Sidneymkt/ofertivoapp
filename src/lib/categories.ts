import { 
  Utensils, Coffee, ShoppingBag, Gift, Dumbbell, Ticket, Car, Pizza, 
  Scissors, Heart, GraduationCap, Smartphone, PawPrint, Cross, ShoppingCart,
  HardHat, Plane, Landmark, Home, Tag,
  type LucideIcon
} from 'lucide-react';

/**
 * Fonte única de verdade para todas as categorias do sistema.
 * Sincroniza: CategorySelect, Home, Offers, Map, categoryStyles, etc.
 */
export interface CategoryConfig {
  /** Slug armazenado no banco de dados */
  value: string;
  /** Nome de exibição completo (formulários, filtros) */
  label: string;
  /** Nome curto para chips/botões */
  shortLabel: string;
  /** Ícone Lucide */
  icon: LucideIcon;
  /** Estilo de gradiente */
  style: string;
  /** Mostrar nas categorias populares da Home */
  featured?: boolean;
}

export const CATEGORIES: CategoryConfig[] = [
  { value: 'alimentacao', label: 'Alimentação & Restaurantes', shortLabel: 'Alimentação', icon: Utensils, style: 'bg-gradient-to-r from-orange-500 to-red-500 text-white', featured: true },
  { value: 'beleza', label: 'Beleza & Estética', shortLabel: 'Beleza', icon: Scissors, style: 'bg-gradient-to-r from-pink-500 to-purple-500 text-white', featured: true },
  { value: 'saude', label: 'Saúde & Bem-estar', shortLabel: 'Saúde', icon: Heart, style: 'bg-gradient-to-r from-emerald-500 to-green-600 text-white', featured: true },
  { value: 'moda', label: 'Moda & Vestuário', shortLabel: 'Moda', icon: ShoppingBag, style: 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white', featured: true },
  { value: 'servicos', label: 'Serviços Gerais', shortLabel: 'Serviços', icon: Car, style: 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white', featured: true },
  { value: 'automotivo', label: 'Automotivo', shortLabel: 'Automotivo', icon: Car, style: 'bg-gradient-to-r from-red-600 to-orange-600 text-white', featured: true },
  { value: 'casa', label: 'Casa & Decoração', shortLabel: 'Casa', icon: Home, style: 'bg-gradient-to-r from-green-500 to-teal-500 text-white', featured: true },
  { value: 'tecnologia', label: 'Tecnologia & Eletrônicos', shortLabel: 'Tecnologia', icon: Smartphone, style: 'bg-gradient-to-r from-gray-700 to-gray-900 text-white', featured: true },
  { value: 'esporte', label: 'Esporte & Lazer', shortLabel: 'Esportes', icon: Dumbbell, style: 'bg-gradient-to-r from-green-600 to-lime-600 text-white', featured: true },
  { value: 'educacao', label: 'Educação', shortLabel: 'Educação', icon: GraduationCap, style: 'bg-gradient-to-r from-blue-600 to-purple-600 text-white', featured: true },
  { value: 'pet', label: 'Pet Shop', shortLabel: 'Pets', icon: PawPrint, style: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white', featured: true },
  { value: 'farmacia', label: 'Farmácia & Drogaria', shortLabel: 'Farmácia', icon: Cross, style: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white', featured: true },
  { value: 'mercado', label: 'Mercado & Conveniência', shortLabel: 'Mercado', icon: ShoppingCart, style: 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white', featured: true },
  { value: 'construcao', label: 'Construção & Reforma', shortLabel: 'Construção', icon: HardHat, style: 'bg-gradient-to-r from-orange-600 to-red-600 text-white', featured: true },
  { value: 'turismo', label: 'Turismo & Hospedagem', shortLabel: 'Turismo', icon: Plane, style: 'bg-gradient-to-r from-sky-500 to-blue-500 text-white', featured: true },
  { value: 'entretenimento', label: 'Entretenimento', shortLabel: 'Entretenimento', icon: Ticket, style: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white', featured: true },
  { value: 'financeiro', label: 'Serviços Financeiros', shortLabel: 'Financeiro', icon: Landmark, style: 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white', featured: true },
  { value: 'outros', label: 'Outros', shortLabel: 'Outros', icon: Tag, style: 'bg-gradient-to-r from-gray-500 to-slate-500 text-white', featured: true },
];

/** Categorias marcadas como featured para a Home */
export const FEATURED_CATEGORIES = CATEGORIES.filter(c => c.featured);

/** Retorna a config de uma categoria pelo value (slug) */
export function getCategoryByValue(value: string | null | undefined): CategoryConfig | undefined {
  if (!value) return undefined;
  return CATEGORIES.find(c => c.value === value);
}

/** Retorna o estilo de gradiente pelo value ou shortLabel */
export function getCategoryStyle(category: string): string {
  const byValue = CATEGORIES.find(c => c.value === category);
  if (byValue) return byValue.style;
  const byShort = CATEGORIES.find(c => c.shortLabel === category);
  if (byShort) return byShort.style;
  const byLabel = CATEGORIES.find(c => c.label === category);
  if (byLabel) return byLabel.style;
  return 'bg-gradient-to-r from-gray-500 to-slate-500 text-white';
}

/** Mapeamento de slug → shortLabel para filtros de URL */
export const CATEGORY_SLUG_TO_SHORT: Record<string, string> = Object.fromEntries(
  CATEGORIES.map(c => [c.value, c.shortLabel])
);

/** Lista de shortLabels para filtros (com "Todos" na frente) */
export const CATEGORY_FILTER_LIST = ['Todos', ...CATEGORIES.map(c => c.shortLabel)];

/** Mapeia shortLabel → value para matching no filtro */
export const CATEGORY_SHORT_TO_SLUG: Record<string, string> = Object.fromEntries(
  CATEGORIES.map(c => [c.shortLabel, c.value])
);
