/**
 * Estilos centralizados para categorias de ofertas/negócios
 * Evita duplicação de código em múltiplos componentes
 */

const categoryStyles: Record<string, string> = {
  // Categorias em português (formato capitalizado)
  'Alimentação': 'bg-gradient-to-r from-orange-500 to-red-500 text-white',
  'Beleza': 'bg-gradient-to-r from-pink-500 to-purple-500 text-white',
  'Roupas': 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white',
  'Casa': 'bg-gradient-to-r from-green-500 to-teal-500 text-white',
  'Saúde': 'bg-gradient-to-r from-emerald-500 to-green-600 text-white',
  'Educação': 'bg-gradient-to-r from-blue-600 to-purple-600 text-white',
  'Tecnologia': 'bg-gradient-to-r from-gray-700 to-gray-900 text-white',
  'Automotivo': 'bg-gradient-to-r from-red-600 to-orange-600 text-white',
  'Pets': 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white',
  'Esportes': 'bg-gradient-to-r from-green-600 to-lime-600 text-white',
  'Viagem': 'bg-gradient-to-r from-sky-500 to-blue-500 text-white',
  'Entretenimento': 'bg-gradient-to-r from-purple-600 to-pink-600 text-white',
  'Serviços': 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white',
  'Eventos': 'bg-gradient-to-r from-rose-500 to-pink-500 text-white',
  'Construção': 'bg-gradient-to-r from-orange-600 to-red-600 text-white',
  'Artesanato': 'bg-gradient-to-r from-amber-600 to-orange-500 text-white',
  'Fotografia': 'bg-gradient-to-r from-slate-600 to-gray-700 text-white',
  'Limpeza': 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white',
  'Consultoria': 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white',
  
  // Categorias em formato minúsculo (legado)
  'alimentacao': 'bg-gradient-to-r from-orange-500 to-red-500 text-white',
  'moda': 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white',
  'servicos': 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white',
  'esporte': 'bg-gradient-to-r from-green-600 to-lime-600 text-white',
  'entretenimento': 'bg-gradient-to-r from-purple-600 to-pink-600 text-white',
  'outros': 'bg-gradient-to-r from-gray-500 to-slate-500 text-white',
  
  // Categoria padrão
  'Geral': 'bg-gradient-to-r from-gray-500 to-slate-500 text-white',
};

/**
 * Retorna a classe CSS de estilo para uma categoria
 * @param category - Nome da categoria
 * @returns Classe CSS do gradiente
 */
export const getCategoryStyle = (category: string): string => {
  return categoryStyles[category] || categoryStyles['Geral'];
};

/**
 * Lista de todas as categorias disponíveis
 */
export const availableCategories = [
  'Alimentação',
  'Beleza',
  'Roupas',
  'Casa',
  'Saúde',
  'Educação',
  'Tecnologia',
  'Automotivo',
  'Pets',
  'Esportes',
  'Viagem',
  'Entretenimento',
  'Serviços',
  'Eventos',
  'Construção',
  'Artesanato',
  'Fotografia',
  'Limpeza',
  'Consultoria',
  'Geral',
] as const;

export type CategoryName = typeof availableCategories[number];
