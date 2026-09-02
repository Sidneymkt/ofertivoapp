import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Key, DollarSign, Users, Wallet, Clock } from 'lucide-react';
import { useAdminPixDonations } from '@/hooks/usePixDonation';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const AdminPixDonations = () => {
  const { user } = useAuth();
  const {
    allDonations,
    loadingAll,
    loading,
    pixKeyConfig,
    savePixKey,
    confirmDonation,
    cancelDonation,
    totalArrecadado,
    totalFundo,
    totalPontos,
  } = useAdminPixDonations();

  const [keyType, setKeyType] = useState((pixKeyConfig?.setting_value as any)?.type || 'cpf');
  const [keyValue, setKeyValue] = useState((pixKeyConfig?.setting_value as any)?.value || '');
  const [holderName, setHolderName] = useState((pixKeyConfig?.setting_value as any)?.holder || '');

  React.useEffect(() => {
    if (pixKeyConfig?.setting_value) {
      const sv = pixKeyConfig.setting_value as any;
      setKeyType(sv.type || 'cpf');
      setKeyValue(sv.value || '');
      setHolderName(sv.holder || '');
    }
  }, [pixKeyConfig]);

  const pendingCount = allDonations.filter(d => d.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold">R$ {totalArrecadado.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Total Arrecadado</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Wallet className="h-6 w-6 mx-auto mb-1 text-purple-500" />
            <p className="text-2xl font-bold">R$ {totalFundo.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Fundo (10%)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{totalPontos}</p>
            <p className="text-xs text-muted-foreground">Pontos Gerados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto mb-1 text-amber-500" />
            <p className="text-2xl font-bold">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="donations">
        <TabsList>
          <TabsTrigger value="donations">
            Doações {pendingCount > 0 && <Badge className="ml-2" variant="destructive">{pendingCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="pix-config">Configurar PIX</TabsTrigger>
        </TabsList>

        <TabsContent value="donations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Doações via PIX</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAll ? (
                <p className="text-center py-4 text-muted-foreground">Carregando...</p>
              ) : allDonations.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Nenhuma doação registrada</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Pontos</TableHead>
                        <TableHead>Fundo</TableHead>
                        <TableHead>ID Transação</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allDonations.map((donation) => (
                        <TableRow key={donation.id}>
                          <TableCell className="text-xs">
                            {format(new Date(donation.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={donation.user_type === 'anunciante' ? 'default' : 'secondary'}>
                              {donation.user_type === 'anunciante' ? '🏪' : '👤'} {donation.user_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold">
                            R$ {Number(donation.valor_total).toFixed(2)}
                          </TableCell>
                          <TableCell>{donation.pontos_gerados} pts</TableCell>
                          <TableCell className="text-muted-foreground">
                            R$ {Number(donation.valor_fundo).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {donation.transaction_id_pix?.substring(0, 15)}...
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                donation.status === 'confirmed'
                                  ? 'default'
                                  : donation.status === 'cancelled'
                                  ? 'destructive'
                                  : 'outline'
                              }
                              className={donation.status === 'confirmed' ? 'bg-green-600' : ''}
                            >
                              {donation.status === 'confirmed' && '✅'}
                              {donation.status === 'pending' && '⏳'}
                              {donation.status === 'cancelled' && '❌'}
                              {' '}{donation.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {donation.status === 'pending' && (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="h-7 text-xs"
                                  disabled={loading}
                                  onClick={() => confirmDonation(donation.id, user?.id || '')}
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Confirmar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-7 text-xs"
                                  disabled={loading}
                                  onClick={() => cancelDonation(donation.id)}
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Cancelar
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pix-config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Key className="h-5 w-5" />
                Configurar Chave PIX
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo da Chave</Label>
                <Select value={keyType} onValueChange={setKeyType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="cnpj">CNPJ</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="telefone">Telefone</SelectItem>
                    <SelectItem value="aleatoria">Chave Aleatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Chave PIX</Label>
                <Input
                  value={keyValue}
                  onChange={(e) => setKeyValue(e.target.value)}
                  placeholder="Digite a chave PIX..."
                />
              </div>

              <div className="space-y-2">
                <Label>Nome do Titular</Label>
                <Input
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  placeholder="Nome completo do titular"
                />
              </div>

              <Button
                onClick={() => savePixKey(keyType, keyValue, holderName)}
                disabled={loading || !keyValue}
              >
                {loading ? 'Salvando...' : 'Salvar Chave PIX'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
