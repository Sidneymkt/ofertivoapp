import React, { useState, useEffect } from 'react';
import { useFundoSocial } from '@/hooks/useFundoSocial';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Wallet, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Users, 
  Settings, 
  CheckCircle, 
  XCircle, 
  Clock,
  FileText,
  DollarSign,
  TrendingUp,
  Percent
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const AdminFundoSocial = () => {
  const {
    fundo,
    movimentacoes,
    beneficiarios,
    loading,
    loadFundo,
    loadMovimentacoes,
    loadBeneficiarios,
    updateBeneficiarioStatus,
    updatePercentualReceita,
    pontosParaReais
  } = useFundoSocial();

  const [activeTab, setActiveTab] = useState('overview');
  const [selectedBeneficiario, setSelectedBeneficiario] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'aprovar' | 'rejeitar' | null>(null);
  const [notasAdmin, setNotasAdmin] = useState('');
  const [novoPercentual, setNovoPercentual] = useState('');
  const [showPercentualDialog, setShowPercentualDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadFundo();
    loadMovimentacoes();
    loadBeneficiarios();
  }, []);

  const handleBeneficiarioAction = async () => {
    if (!selectedBeneficiario || !actionType) return;
    
    const success = await updateBeneficiarioStatus(
      selectedBeneficiario,
      actionType === 'aprovar' ? 'aprovado' : 'rejeitado',
      notasAdmin
    );

    if (success) {
      setSelectedBeneficiario(null);
      setActionType(null);
      setNotasAdmin('');
    }
  };

  const handlePercentualUpdate = async () => {
    const percentual = parseFloat(novoPercentual);
    if (isNaN(percentual) || percentual < 0 || percentual > 100) return;

    const success = await updatePercentualReceita(percentual);
    if (success) {
      setShowPercentualDialog(false);
      setNovoPercentual('');
    }
  };

  const getMovimentacaoIcon = (tipo: string) => {
    switch (tipo) {
      case 'entrada':
        return <ArrowDownCircle className="h-4 w-4 text-green-500" />;
      case 'saida':
      case 'liberacao':
        return <ArrowUpCircle className="h-4 w-4 text-red-500" />;
      case 'reserva':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <DollarSign className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getMovimentacaoColor = (tipo: string) => {
    switch (tipo) {
      case 'entrada':
        return 'text-green-500';
      case 'saida':
      case 'liberacao':
        return 'text-red-500';
      case 'reserva':
        return 'text-yellow-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const getBeneficiarioStatusBadge = (status: string) => {
    switch (status) {
      case 'aprovado':
        return <Badge className="bg-green-500/10 text-green-500">Aprovado</Badge>;
      case 'rejeitado':
        return <Badge variant="destructive">Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  const filteredBeneficiarios = statusFilter === 'all' 
    ? beneficiarios 
    : beneficiarios.filter(b => b.status === statusFilter);

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Saldo Disponível
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {(fundo?.saldo_disponivel || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Saldo Reservado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {(fundo?.saldo_reservado || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Arrecadado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {(fundo?.total_arrecadado || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4" />
              Total Liberado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">
              {(fundo?.total_liberado || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="movimentacoes" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Movimentações</span>
          </TabsTrigger>
          <TabsTrigger value="beneficiarios" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Beneficiários</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab Visão Geral */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações do Fundo
              </CardTitle>
              <CardDescription>
                Configure os parâmetros do Fundo Social Ofertivo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Percentual de Contribuição
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Percentual da receita de assinaturas destinado ao Fundo Social
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-lg px-4 py-2">
                    {fundo?.percentual_receita || 10}%
                  </Badge>
                  <Dialog open={showPercentualDialog} onOpenChange={setShowPercentualDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">Alterar</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Alterar Percentual</DialogTitle>
                        <DialogDescription>
                          Defina o percentual da receita que será destinado ao Fundo Social
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Novo Percentual (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={novoPercentual}
                            onChange={(e) => setNovoPercentual(e.target.value)}
                            placeholder="Ex: 10"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPercentualDialog(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handlePercentualUpdate} disabled={loading}>
                          Salvar
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">📊 Sobre o Fundo</h4>
                  <p className="text-sm text-muted-foreground">
                    O Fundo Social Ofertivo é alimentado por um percentual das assinaturas dos anunciantes. 
                    Os pontos doados em vaquinhas destravam recursos reais deste fundo para apoiar causas sociais.
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">💡 Regra de Conversão</h4>
                  <p className="text-sm text-muted-foreground">
                    <strong>100 pontos = R$ 1,00</strong><br />
                    Os pontos não são dinheiro direto - eles representam engajamento que destrava 
                    recursos do Fundo Social.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Movimentações */}
        <TabsContent value="movimentacoes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Histórico de Movimentações
              </CardTitle>
              <CardDescription>
                Todas as entradas e saídas do Fundo Social
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead className="hidden md:table-cell">Campanha</TableHead>
                      <TableHead className="hidden lg:table-cell">Descrição</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : movimentacoes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">Nenhuma movimentação registrada</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      movimentacoes.map((mov) => (
                        <TableRow key={mov.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getMovimentacaoIcon(mov.tipo)}
                              <span className="capitalize">{mov.tipo}</span>
                            </div>
                          </TableCell>
                          <TableCell className={getMovimentacaoColor(mov.tipo)}>
                            {mov.tipo === 'entrada' ? '+' : '-'}
                            {mov.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {mov.campanha?.title || '-'}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <span className="text-sm text-muted-foreground line-clamp-1">
                              {mov.descricao || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {format(new Date(mov.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Beneficiários */}
        <TabsContent value="beneficiarios">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Beneficiários Cadastrados
                  </CardTitle>
                  <CardDescription>
                    Gerencie os beneficiários verificados para recebimento
                  </CardDescription>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pendente">Pendentes</SelectItem>
                    <SelectItem value="aprovado">Aprovados</SelectItem>
                    <SelectItem value="rejeitado">Rejeitados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Beneficiário</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="hidden md:table-cell">Documento</TableHead>
                      <TableHead className="hidden lg:table-cell">Chave Pix</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : filteredBeneficiarios.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">Nenhum beneficiário encontrado</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBeneficiarios.map((beneficiario) => (
                        <TableRow key={beneficiario.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{beneficiario.nome}</p>
                              <p className="text-xs text-muted-foreground">{beneficiario.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {beneficiario.tipo === 'pessoa_fisica' ? 'Pessoa Física' : 'Instituição'}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {beneficiario.documento}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {beneficiario.chave_pix || '-'}
                          </TableCell>
                          <TableCell>
                            {getBeneficiarioStatusBadge(beneficiario.status)}
                          </TableCell>
                          <TableCell>
                            {beneficiario.status === 'pendente' && (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-green-500 hover:text-green-600"
                                  onClick={() => {
                                    setSelectedBeneficiario(beneficiario.id);
                                    setActionType('aprovar');
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-500 hover:text-red-600"
                                  onClick={() => {
                                    setSelectedBeneficiario(beneficiario.id);
                                    setActionType('rejeitar');
                                  }}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de confirmação de ação em beneficiário */}
      <AlertDialog open={!!actionType && !!selectedBeneficiario} onOpenChange={() => { setActionType(null); setSelectedBeneficiario(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'aprovar' ? 'Aprovar Beneficiário' : 'Rejeitar Beneficiário'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'aprovar' 
                ? 'O beneficiário será verificado e poderá receber pagamentos de vaquinhas.'
                : 'O beneficiário será rejeitado e não poderá receber pagamentos.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Notas/Observações (opcional)</Label>
              <Textarea
                value={notasAdmin}
                onChange={(e) => setNotasAdmin(e.target.value)}
                placeholder="Adicione uma observação..."
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBeneficiarioAction}
              className={actionType === 'aprovar' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}
            >
              {actionType === 'aprovar' ? 'Aprovar' : 'Rejeitar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
