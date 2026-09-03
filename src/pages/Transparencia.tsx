import { useState, useEffect } from 'react';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SEOHead } from '@/components/SEOHead';
import { supabase } from '@/integrations/supabase/client';
import { 
  Wallet, 
  TrendingUp, 
  Heart, 
  Users, 
  ArrowUpCircle,
  CheckCircle,
  FileText,
  ExternalLink,
  Shield
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FundoStats {
  saldo_disponivel: number;
  total_arrecadado: number;
  total_liberado: number;
  percentual_receita: number;
}

interface CampanhaPaga {
  id: string;
  title: string;
  goal_points: number;
  current_points: number;
  valor_liberado: number;
  data_liberacao: string;
  comprovante_pagamento_url: string | null;
  creator?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface Movimentacao {
  id: string;
  tipo: string;
  valor: number;
  descricao: string | null;
  created_at: string;
  campanha?: {
    title: string;
  } | null;
}

const Transparencia = () => {
  const [fundoStats, setFundoStats] = useState<FundoStats | null>(null);
  const [campanhasPagas, setCampanhasPagas] = useState<CampanhaPaga[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [totalCampanhasAtivas, setTotalCampanhasAtivas] = useState(0);
  const [totalContribuicoes, setTotalContribuicoes] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar estatísticas do fundo
      const { data: fundo } = await supabase
        .from('fundo_social')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (fundo) {
        setFundoStats(fundo);
      }

      // Carregar campanhas pagas
      const { data: campanhas } = await supabase
        .from('crowdfunding_campaigns')
        .select('*')
        .eq('status_pagamento', 'pago')
        .order('data_liberacao', { ascending: false });

      if (campanhas) {
        // Buscar criadores
        const campanhasComCriadores = await Promise.all(
          campanhas.map(async (campanha) => {
            const { data: creator } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('user_id', campanha.creator_id)
              .maybeSingle();

            return { ...campanha, creator };
          })
        );
        setCampanhasPagas(campanhasComCriadores);
      }

      // Carregar movimentações públicas (apenas liberações)
      const { data: movs } = await supabase
        .from('fundo_social_movimentacoes')
        .select(`
          id, tipo, valor, descricao, created_at,
          campanha:crowdfunding_campaigns(title)
        `)
        .in('tipo', ['liberacao', 'entrada'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (movs) {
        setMovimentacoes(movs as any);
      }

      // Contar campanhas ativas
      const { count: ativas } = await supabase
        .from('crowdfunding_campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      setTotalCampanhasAtivas(ativas || 0);

      // Contar contribuições
      const { count: contrib } = await supabase
        .from('campaign_contributions')
        .select('*', { count: 'exact', head: true });

      setTotalContribuicoes(contrib || 0);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const pontosParaReais = (pontos: number): string => {
    return (pontos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-center">
          <Shield className="h-12 w-12 mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Carregando dados de transparência...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="Transparência - Fundo Social Ofertivo"
        description="Acompanhe a transparência do Fundo Social Ofertivo. Veja quanto foi arrecadado, quanto foi liberado e todas as campanhas apoiadas."
      />
      
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <div className="container max-w-6xl mx-auto px-4 py-6">
          <div className="mb-6">
            <BackButton />
            <div className="flex items-center gap-3 mt-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Transparência</h1>
                <p className="text-muted-foreground">
                  Fundo Social Ofertivo - Prestação de contas pública
                </p>
              </div>
            </div>
          </div>

          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Total Arrecadado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold text-green-600">
                  {(fundoStats?.total_arrecadado || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <ArrowUpCircle className="h-4 w-4" />
                  Total Liberado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold text-purple-600">
                  {(fundoStats?.total_liberado || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Campanhas Apoiadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold text-blue-600">
                  {campanhasPagas.length}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total Contribuições
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold text-orange-600">
                  {totalContribuicoes.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sobre o Fundo */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Sobre o Fundo Social Ofertivo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">📌 Como funciona?</h4>
                  <p className="text-sm text-muted-foreground">
                    O Fundo Social é alimentado por {fundoStats?.percentual_receita || 10}% da receita 
                    das assinaturas dos anunciantes. Quando uma vaquinha atinge sua meta, 
                    os recursos são liberados deste fundo para apoiar a causa.
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">💡 Regra de Conversão</h4>
                  <p className="text-sm text-muted-foreground">
                    <strong>100 pontos = R$ 1,00</strong><br />
                    Os pontos representam engajamento da comunidade. Eles não são dinheiro direto, 
                    mas destravam recursos reais do Fundo Social.
                  </p>
                </div>
              </div>
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm">
                  ✅ <strong>Transparência total:</strong> Todas as movimentações do fundo são públicas e 
                  os comprovantes de pagamento ficam disponíveis para consulta.
                </p>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="campanhas" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="campanhas" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Campanhas Pagas
              </TabsTrigger>
              <TabsTrigger value="movimentacoes" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Movimentações
              </TabsTrigger>
            </TabsList>

            {/* Campanhas Pagas */}
            <TabsContent value="campanhas">
              <Card>
                <CardHeader>
                  <CardTitle>Campanhas com Pagamento Concluído</CardTitle>
                  <CardDescription>
                    Todas as vaquinhas que atingiram a meta e tiveram o pagamento liberado
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {campanhasPagas.length === 0 ? (
                    <div className="text-center py-12">
                      <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        Nenhuma campanha paga ainda. Contribua para uma vaquinha!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {campanhasPagas.map((campanha) => (
                        <div key={campanha.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className="bg-emerald-500/10 text-emerald-500">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Pago
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {campanha.data_liberacao && format(new Date(campanha.data_liberacao), "dd/MM/yyyy", { locale: ptBR })}
                                </span>
                              </div>
                              <h4 className="font-semibold">{campanha.title}</h4>
                              
                              {campanha.creator && (
                                <div className="flex items-center gap-2 mt-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={campanha.creator.avatar_url || undefined} />
                                    <AvatarFallback>
                                      {campanha.creator.full_name?.charAt(0) || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm text-muted-foreground">
                                    {campanha.creator.full_name}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            <div className="text-right">
                              <p className="text-lg font-bold text-emerald-600">
                                {(campanha.valor_liberado || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {campanha.current_points.toLocaleString()} pontos
                              </p>
                              {campanha.comprovante_pagamento_url && (
                                <a 
                                  href={campanha.comprovante_pagamento_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline flex items-center gap-1 justify-end mt-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Ver comprovante
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Movimentações */}
            <TabsContent value="movimentacoes">
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Movimentações</CardTitle>
                  <CardDescription>
                    Entradas e liberações do Fundo Social
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead className="hidden md:table-cell">Descrição</TableHead>
                          <TableHead>Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movimentacoes.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8">
                              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                              <p className="text-muted-foreground">Nenhuma movimentação registrada</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          movimentacoes.map((mov) => (
                            <TableRow key={mov.id}>
                              <TableCell>
                                <Badge variant={mov.tipo === 'entrada' ? 'default' : 'secondary'}>
                                  {mov.tipo === 'entrada' ? '↓ Entrada' : '↑ Liberação'}
                                </Badge>
                              </TableCell>
                              <TableCell className={mov.tipo === 'entrada' ? 'text-green-600' : 'text-purple-600'}>
                                {mov.tipo === 'entrada' ? '+' : '-'}
                                {mov.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <span className="text-sm text-muted-foreground line-clamp-1">
                                  {mov.campanha?.title || mov.descricao || '-'}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">
                                  {format(new Date(mov.created_at), 'dd/MM/yy', { locale: ptBR })}
                                </span>
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
        </div>
      </div>
    </>
  );
};

export default Transparencia;
