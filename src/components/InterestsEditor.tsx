import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InterestsEditorProps {
  userId: string;
  initialInterests?: string[];
  onInterestsChange?: (interests: string[]) => void;
}

export const InterestsEditor: React.FC<InterestsEditorProps> = ({
  userId,
  initialInterests = [],
  onInterestsChange
}) => {
  const { toast } = useToast();
  const [interests, setInterests] = useState<string[]>(initialInterests);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Keep in sync if profile reloads
  useEffect(() => {
    setInterests(initialInterests || []);
  }, [initialInterests]);

  const normalized = useMemo(
    () => interests.map((i) => i.trim()).filter(Boolean),
    [interests]
  );

  const persist = async (next: string[]) => {
    if (!userId) {
      console.error('InterestsEditor: userId não definido');
      return;
    }
    
    setSaving(true);
    
    // Garantir que o array está limpo
    const cleanedInterests = next.filter(i => i && i.trim() !== '');
    
    console.log('InterestsEditor: Salvando interesses para userId:', userId, 'interesses:', cleanedInterests);
    
    const { data, error } = await supabase
      .from('profiles')
      .update({ interests: cleanedInterests })
      .eq('user_id', userId)
      .select('interests');

    setSaving(false);

    if (error) {
      console.error('InterestsEditor: Erro ao salvar interesses:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar seus interesses: ' + error.message,
        variant: 'destructive',
      });
      return;
    }

    console.log('InterestsEditor: Interesses salvos com sucesso:', data);
    
    toast({
      title: 'Interesses atualizados',
      description: 'Suas preferências foram salvas.',
    });
    setInterests(cleanedInterests);
    onInterestsChange?.(cleanedInterests);
  };

  const addInterest = () => {
    const value = input.trim();
    if (!value) return;
    if (normalized.includes(value)) {
      setInput('');
      return;
    }
    const next = [...normalized, value];
    setInput('');
    void persist(next);
  };

  const removeInterest = (value: string) => {
    const next = normalized.filter((i) => i !== value);
    void persist(next);
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      e.preventDefault();
      addInterest();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {normalized.length === 0 ? (
          <span className="text-sm text-muted-foreground">Nenhum interesse adicionado ainda.</span>
        ) : (
          normalized.map((tag) => (
            <div key={tag} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1">
              <span className="text-sm">{tag}</span>
              <button
                aria-label={`Remover ${tag}`}
                onClick={() => removeInterest(tag)}
                className="text-muted-foreground hover:text-foreground transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder="Adicione um interesse e pressione Enter (ex: pizza, hamburguer, sushi)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <Button onClick={addInterest} disabled={!input.trim() || saving}>
          <Plus className="w-4 h-4 mr-1" />
          Adicionar
        </Button>
      </div>

      {saving && (
        <div className="text-xs text-muted-foreground">Salvando...</div>
      )}
      <div className="text-xs text-muted-foreground">
        Dica: Esses interesses ajudam anunciantes a criarem ofertas mais relevantes para você.
      </div>
    </div>
  );
};

export default InterestsEditor;
