import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Tag, User, Store, Gift, Heart, 
  X, Search, Loader2, Plus 
} from 'lucide-react';

export interface Mention {
  type: 'offer' | 'user' | 'business' | 'raffle' | 'campaign';
  id: string;
  name: string;
}

interface PostMentionSelectorProps {
  mentions: Mention[];
  onMentionsChange: (mentions: Mention[]) => void;
}

interface SearchResult {
  id: string;
  name: string;
  subtitle?: string;
}

export const PostMentionSelector = ({ mentions, onMentionsChange }: PostMentionSelectorProps) => {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Mention['type']>('offer');
  const [results, setResults] = useState<SearchResult[]>([]);

  const searchItems = async (type: Mention['type'], query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      let data: SearchResult[] = [];

      switch (type) {
        case 'offer':
          const { data: offers } = await supabase
            .from('offers')
            .select('id, title, business_id')
            .eq('is_active', true)
            .ilike('title', `%${query}%`)
            .limit(10);
          
          if (offers) {
            // Get business names
            const businessIds = [...new Set(offers.map(o => o.business_id))];
            const { data: businesses } = await supabase
              .from('businesses')
              .select('id, name')
              .in('id', businessIds);
            
            const businessMap = new Map<any, any>(businesses?.map(b => [b.id, b.name]) || []);
            data = offers.map(o => ({
              id: o.id,
              name: o.title,
              subtitle: businessMap.get(o.business_id) || ''
            }));
          }
          break;

        case 'user':
          const { data: users } = await supabase
            .from('profiles')
            .select('user_id, full_name, city')
            .eq('user_type', 'consumer')
            .ilike('full_name', `%${query}%`)
            .limit(10);
          
          data = (users || []).map(u => ({
            id: u.user_id,
            name: u.full_name || 'Usuário',
            subtitle: u.city || ''
          }));
          break;

        case 'business':
          const { data: businesses2 } = await supabase
            .from('businesses')
            .select('id, name, category')
            .eq('is_active', true)
            .ilike('name', `%${query}%`)
            .limit(10);
          
          data = (businesses2 || []).map(b => ({
            id: b.id,
            name: b.name,
            subtitle: b.category
          }));
          break;

        case 'raffle':
          const { data: raffles } = await supabase
            .from('raffles')
            .select('id, title, prize')
            .eq('is_active', true)
            .ilike('title', `%${query}%`)
            .limit(10);
          
          data = (raffles || []).map(r => ({
            id: r.id,
            name: r.title,
            subtitle: r.prize
          }));
          break;

        case 'campaign':
          const { data: campaigns } = await supabase
            .from('crowdfunding_campaigns')
            .select('id, title, category')
            .eq('is_active', true)
            .ilike('title', `%${query}%`)
            .limit(10);
          
          data = (campaigns || []).map(c => ({
            id: c.id,
            name: c.title,
            subtitle: c.category
          }));
          break;
      }

      setResults(data);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchItems(activeTab, search);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [search, activeTab]);

  const addMention = (result: SearchResult) => {
    if (mentions.some(m => m.type === activeTab && m.id === result.id)) return;
    
    onMentionsChange([...mentions, {
      type: activeTab,
      id: result.id,
      name: result.name
    }]);
    setSearch('');
    setResults([]);
  };

  const removeMention = (index: number) => {
    onMentionsChange(mentions.filter((_, i) => i !== index));
  };

  const getTypeIcon = (type: Mention['type']) => {
    switch (type) {
      case 'offer': return <Tag className="h-3 w-3" />;
      case 'user': return <User className="h-3 w-3" />;
      case 'business': return <Store className="h-3 w-3" />;
      case 'raffle': return <Gift className="h-3 w-3" />;
      case 'campaign': return <Heart className="h-3 w-3" />;
    }
  };

  const getTypeColor = (type: Mention['type']) => {
    switch (type) {
      case 'offer': return 'bg-primary/10 text-primary border-primary/20';
      case 'user': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'business': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'raffle': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'campaign': return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
    }
  };

  return (
    <div className="space-y-3">
      {/* Menções selecionadas */}
      {mentions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {mentions.map((mention, index) => (
            <Badge 
              key={`${mention.type}-${mention.id}`}
              variant="outline"
              className={`flex items-center gap-1.5 pr-1 ${getTypeColor(mention.type)}`}
            >
              {getTypeIcon(mention.type)}
              <span className="max-w-[120px] truncate">{mention.name}</span>
              <button
                type="button"
                onClick={() => removeMention(index)}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Seletor de tipo e busca */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Mention['type'])}>
        <TabsList className="grid grid-cols-5 h-9">
          <TabsTrigger value="offer" className="text-xs px-2">
            <Tag className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">Ofertas</span>
          </TabsTrigger>
          <TabsTrigger value="user" className="text-xs px-2">
            <User className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">Usuários</span>
          </TabsTrigger>
          <TabsTrigger value="business" className="text-xs px-2">
            <Store className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">Negócios</span>
          </TabsTrigger>
          <TabsTrigger value="raffle" className="text-xs px-2">
            <Gift className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">Sorteios</span>
          </TabsTrigger>
          <TabsTrigger value="campaign" className="text-xs px-2">
            <Heart className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">Vaquinhas</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Buscar ${
                activeTab === 'offer' ? 'ofertas' :
                activeTab === 'user' ? 'usuários' :
                activeTab === 'business' ? 'negócios' :
                activeTab === 'raffle' ? 'sorteios' : 'vaquinhas'
              }...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Resultados */}
          {results.length > 0 && (
            <ScrollArea className="h-[150px] mt-2 border rounded-md">
              <div className="p-2 space-y-1">
                {results.map((result) => {
                  const isSelected = mentions.some(
                    m => m.type === activeTab && m.id === result.id
                  );
                  
                  return (
                    <button
                      key={result.id}
                      type="button"
                      disabled={isSelected}
                      onClick={() => addMention(result)}
                      className={`w-full text-left p-2 rounded-md flex items-center justify-between transition-colors ${
                        isSelected 
                          ? 'bg-muted/50 opacity-50 cursor-not-allowed' 
                          : 'hover:bg-muted cursor-pointer'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{result.name}</p>
                        {result.subtitle && (
                          <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                        )}
                      </div>
                      {!isSelected && (
                        <Plus className="h-4 w-4 ml-2 text-muted-foreground" />
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          {search && !loading && results.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum resultado encontrado
            </p>
          )}
        </div>
      </Tabs>
    </div>
  );
};
