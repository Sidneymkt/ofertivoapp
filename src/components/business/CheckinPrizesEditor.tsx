import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gift, Plus, X, Trophy, Coffee, Ticket, Percent, Star } from 'lucide-react';

export interface CheckinPrize {
  id: string;
  type: 'product' | 'discount' | 'experience' | 'ticket' | 'custom';
  name: string;
  description?: string;
  quantity?: number;
  every_n_checkins?: number; // a cada N check-ins
}

const PRIZE_TYPES = [
  { value: 'product', label: 'Produto/Brinde', icon: Coffee, color: 'text-amber-500' },
  { value: 'discount', label: 'Cupom de Desconto', icon: Percent, color: 'text-emerald-500' },
  { value: 'experience', label: 'Experiência', icon: Star, color: 'text-purple-500' },
  { value: 'ticket', label: 'Bilhete de Sorteio', icon: Ticket, color: 'text-blue-500' },
  { value: 'custom', label: 'Outro Prêmio', icon: Gift, color: 'text-pink-500' },
];

interface CheckinPrizesEditorProps {
  prizes: CheckinPrize[];
  onChange: (prizes: CheckinPrize[]) => void;
}

const CheckinPrizesEditor = ({ prizes, onChange }: CheckinPrizesEditorProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newPrize, setNewPrize] = useState<Partial<CheckinPrize>>({
    type: 'product',
    name: '',
    description: '',
    quantity: undefined,
    every_n_checkins: undefined,
  });

  const addPrize = () => {
    if (!newPrize.name?.trim()) return;
    
    const prize: CheckinPrize = {
      id: crypto.randomUUID(),
      type: (newPrize.type as CheckinPrize['type']) || 'product',
      name: newPrize.name.trim(),
      description: newPrize.description?.trim() || undefined,
      quantity: newPrize.quantity || undefined,
      every_n_checkins: newPrize.every_n_checkins || undefined,
    };

    onChange([...prizes, prize]);
    setNewPrize({ type: 'product', name: '', description: '', quantity: undefined, every_n_checkins: undefined });
    setIsAdding(false);
  };

  const removePrize = (id: string) => {
    onChange(prizes.filter(p => p.id !== id));
  };

  const getPrizeTypeInfo = (type: string) => {
    return PRIZE_TYPES.find(t => t.value === type) || PRIZE_TYPES[4];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-base font-semibold">
          <Trophy className="w-5 h-5 text-amber-500" />
          Prêmios Extras do Check-in
        </Label>
        {!isAdding && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Adicionar Prêmio
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Além dos pontos, ofereça prêmios especiais para atrair mais clientes ao seu estabelecimento.
      </p>

      {/* Lista de prêmios existentes */}
      {prizes.length > 0 && (
        <div className="space-y-2">
          {prizes.map((prize) => {
            const typeInfo = getPrizeTypeInfo(prize.type);
            const Icon = typeInfo.icon;
            return (
              <div
                key={prize.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
              >
                <div className={`p-2 rounded-full bg-muted ${typeInfo.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{prize.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{typeInfo.label}</span>
                    {prize.every_n_checkins && (
                      <>
                        <span>•</span>
                        <span>A cada {prize.every_n_checkins} check-ins</span>
                      </>
                    )}
                    {prize.quantity && (
                      <>
                        <span>•</span>
                        <span>{prize.quantity} disponíveis</span>
                      </>
                    )}
                  </div>
                  {prize.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{prize.description}</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                  onClick={() => removePrize(prize.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Formulário para adicionar novo prêmio */}
      {isAdding && (
        <div className="p-4 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo do Prêmio</Label>
              <Select
                value={newPrize.type}
                onValueChange={(v) => setNewPrize(prev => ({ ...prev, type: v as CheckinPrize['type'] }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-50">
                  {PRIZE_TYPES.map((t) => {
                    const Icon = t.icon;
                    return (
                      <SelectItem key={t.value} value={t.value}>
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${t.color}`} />
                          {t.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nome do Prêmio *</Label>
              <Input
                className="h-9"
                placeholder="Ex: Café Grátis, 10% de Desconto"
                value={newPrize.name}
                onChange={(e) => setNewPrize(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Descrição (opcional)</Label>
            <Input
              className="h-9"
              placeholder="Detalhes sobre o prêmio..."
              value={newPrize.description}
              onChange={(e) => setNewPrize(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">A cada N check-ins (opcional)</Label>
              <Input
                className="h-9"
                type="number"
                min="1"
                placeholder="Ex: 5 (a cada 5 check-ins)"
                value={newPrize.every_n_checkins || ''}
                onChange={(e) => setNewPrize(prev => ({ ...prev, every_n_checkins: e.target.value ? parseInt(e.target.value) : undefined }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Quantidade disponível (opcional)</Label>
              <Input
                className="h-9"
                type="number"
                min="1"
                placeholder="Ex: 50"
                value={newPrize.quantity || ''}
                onChange={(e) => setNewPrize(prev => ({ ...prev, quantity: e.target.value ? parseInt(e.target.value) : undefined }))}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button type="button" size="sm" onClick={addPrize} disabled={!newPrize.name?.trim()}>
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {prizes.length === 0 && !isAdding && (
        <div className="text-center py-4 text-sm text-muted-foreground border border-dashed rounded-lg">
          <Gift className="w-8 h-8 mx-auto mb-2 opacity-40" />
          Nenhum prêmio extra adicionado. Clique em "Adicionar Prêmio" para oferecer brindes, cupons ou experiências.
        </div>
      )}
    </div>
  );
};

export default CheckinPrizesEditor;
