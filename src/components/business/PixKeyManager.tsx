import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { QrCode, Trash2, Save } from 'lucide-react';
import { useBusinessPixKey, PixKeyType } from '@/hooks/useBusinessPixKey';

interface Props { businessId: string }

const KEY_META: Record<PixKeyType, { placeholder: string; inputMode: 'text' | 'numeric' | 'email' | 'tel'; label: string }> = {
  cpf: { placeholder: '000.000.000-00', inputMode: 'numeric', label: 'CPF' },
  cnpj: { placeholder: '12.345.678/0001-90', inputMode: 'numeric', label: 'CNPJ' },
  phone: { placeholder: '+55 92 90000-0000', inputMode: 'tel', label: 'Telefone' },
  email: { placeholder: 'seuemail@dominio.com', inputMode: 'email', label: 'E-mail' },
  random: { placeholder: 'chave-aleatoria-uuid', inputMode: 'text', label: 'Aleatória' },
};

export const PixKeyManager = ({ businessId }: Props) => {
  const { pixKey, loading, save, remove } = useBusinessPixKey(businessId);
  const [keyType, setKeyType] = useState<PixKeyType>('cnpj');
  const [keyValue, setKeyValue] = useState('');
  const [holderName, setHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const keyInputRef = useRef<HTMLInputElement | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (pixKey && !hydratedRef.current) {
      setKeyType(pixKey.key_type);
      setKeyValue(pixKey.key_value);
      setHolderName(pixKey.holder_name);
      setBankName(pixKey.bank_name || '');
      setIsActive(pixKey.is_active);
      hydratedRef.current = true;
    }
  }, [pixKey]);

  const meta = useMemo(() => KEY_META[keyType], [keyType]);

  const handleTypeChange = (v: PixKeyType) => {
    if (v === keyType) return;
    setKeyType(v);
    if (pixKey?.key_type !== v) setKeyValue('');
    // Defer focus to avoid layout thrash while Radix Select closes
    requestAnimationFrame(() => keyInputRef.current?.focus());
  };

  const handleSave = () => {
    if (!keyValue.trim() || !holderName.trim()) return;
    save({ key_type: keyType, key_value: keyValue.trim(), holder_name: holderName.trim(), bank_name: bankName.trim() || null, is_active: isActive });
  };

  if (loading && !pixKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><QrCode className="w-5 h-5 text-primary" /> Chave PIX de recebimento</CardTitle>
          <CardDescription>Carregando configuração…</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-9 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><QrCode className="w-5 h-5 text-primary" /> Chave PIX de recebimento</CardTitle>
        <CardDescription>Consumidores pagarão direto para você. O Ofertivo não intermedia o valor.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Tipo de chave</Label>
            <Select value={keyType} onValueChange={(v) => handleTypeChange(v as PixKeyType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cpf">CPF</SelectItem>
                <SelectItem value="cnpj">CNPJ</SelectItem>
                <SelectItem value="phone">Telefone</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
                <SelectItem value="random">Aleatória</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Chave PIX ({meta.label})</Label>
            <Input
              ref={keyInputRef}
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              placeholder={meta.placeholder}
              inputMode={meta.inputMode}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label>Titular da conta</Label>
            <Input value={holderName} onChange={(e) => setHolderName(e.target.value)} placeholder="Nome exibido no comprovante" />
          </div>
          <div className="space-y-2">
            <Label>Banco (opcional)</Label>
            <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Ex.: Nubank" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={isActive} onCheckedChange={setIsActive} />
          <Label className="text-sm">Ativa (aceitando pagamentos)</Label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} disabled={loading}><Save className="w-4 h-4 mr-2" />Salvar</Button>
          {pixKey && <Button variant="outline" onClick={remove}><Trash2 className="w-4 h-4 mr-2" />Remover</Button>}
        </div>
      </CardContent>
    </Card>
  );
};
