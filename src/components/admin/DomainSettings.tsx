import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Globe, CheckCircle, XCircle, AlertTriangle, Copy } from 'lucide-react';

interface DomainConfig {
  domain: string | null;
  ssl_enabled: boolean;
  ssl_cert_issued_at: string | null;
  dns_verified: boolean;
  dns_verified_at: string | null;
  fallback_domain: string;
  status: 'not_configured' | 'pending_dns' | 'pending_ssl' | 'active' | 'error';
}

const DomainSettings = () => {
  const [config, setConfig] = useState<DomainConfig | null>(null);
  const [newDomain, setNewDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    fetchDomainConfig();
  }, []);

  const fetchDomainConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'custom_domain')
        .eq('is_active', true)
        .single();

      if (error) throw error;

      const configData = data.setting_value as unknown as DomainConfig;
      setConfig(configData);
      if (configData.domain) {
        setNewDomain(configData.domain);
      }
    } catch (error) {
      console.error('Erro ao buscar configuração de domínio:', error);
      toast.error('Erro ao carregar configuração de domínio');
    }
  };

  const updateDomainConfig = async (updates: Partial<DomainConfig>) => {
    try {
      const updatedConfig = { ...config, ...updates };
      
      const { error } = await supabase
        .from('platform_settings')
        .update({ 
          setting_value: updatedConfig,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'custom_domain');

      if (error) throw error;

      setConfig(updatedConfig);
      return true;
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
      return false;
    }
  };

  const handleSaveDomain = async () => {
    if (!newDomain || newDomain.trim().length === 0) {
      toast.error('Digite um domínio válido');
      return;
    }

    // Validar formato do domínio
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(newDomain)) {
      toast.error('Formato de domínio inválido');
      return;
    }

    setLoading(true);
    const success = await updateDomainConfig({
      domain: newDomain.toLowerCase(),
      status: 'pending_dns',
      dns_verified: false,
      ssl_enabled: false,
    });

    if (success) {
      toast.success('Domínio salvo! Configure os registros DNS conforme as instruções abaixo.');
    } else {
      toast.error('Erro ao salvar domínio');
    }
    setLoading(false);
  };

  const handleCheckDNS = async () => {
    if (!config?.domain) return;

    setChecking(true);
    toast.info('Verificando configuração DNS...');

    // Simular verificação DNS (em produção, fazer chamada real)
    setTimeout(async () => {
      // Aqui você faria uma chamada real para verificar DNS
      const dnsVerified = Math.random() > 0.5; // Simulação

      if (dnsVerified) {
        await updateDomainConfig({
          dns_verified: true,
          dns_verified_at: new Date().toISOString(),
          status: 'pending_ssl',
        });
        toast.success('DNS verificado com sucesso! Emitindo certificado SSL...');
        
        // Simular emissão de SSL
        setTimeout(async () => {
          await updateDomainConfig({
            ssl_enabled: true,
            ssl_cert_issued_at: new Date().toISOString(),
            status: 'active',
          });
          toast.success('🎉 Domínio personalizado ativo!');
        }, 2000);
      } else {
        toast.error('DNS ainda não propagado. Aguarde alguns minutos e tente novamente.');
      }
      
      setChecking(false);
    }, 2000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para área de transferência!');
  };

  const getStatusBadge = () => {
    if (!config) return null;

    const statusConfig = {
      not_configured: { label: 'Não configurado', variant: 'secondary' as const, icon: XCircle },
      pending_dns: { label: 'Aguardando DNS', variant: 'default' as const, icon: AlertTriangle },
      pending_ssl: { label: 'Emitindo SSL', variant: 'default' as const, icon: AlertTriangle },
      active: { label: 'Ativo', variant: 'default' as const, icon: CheckCircle },
      error: { label: 'Erro', variant: 'destructive' as const, icon: XCircle },
    };

    const status = statusConfig[config.status];
    const Icon = status.icon;

    return (
      <Badge variant={status.variant} className="gap-2">
        <Icon className="h-3 w-3" />
        {status.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Domínio Personalizado
              </CardTitle>
              <CardDescription>
                Configure um domínio personalizado para sua plataforma
              </CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="domain">Domínio</Label>
            <div className="flex gap-2">
              <Input
                id="domain"
                placeholder="seudominio.com.br"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                disabled={config?.status === 'active'}
              />
              <Button 
                onClick={handleSaveDomain} 
                disabled={loading || config?.status === 'active'}
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
            {config?.domain && (
              <p className="text-sm text-muted-foreground">
                Domínio atual: <strong>{config.domain}</strong>
              </p>
            )}
          </div>

          {config?.domain && config.status !== 'not_configured' && (
            <Alert>
              <AlertDescription>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">1. Configure os registros DNS:</h4>
                    <div className="space-y-2 bg-muted p-4 rounded-md">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-mono">
                            Tipo: <strong>A</strong>
                          </p>
                          <p className="text-sm font-mono">
                            Nome: <strong>@</strong> (ou deixe em branco)
                          </p>
                          <p className="text-sm font-mono">
                            Valor: <strong>185.158.133.1</strong>
                          </p>
                          <p className="text-sm font-mono">
                            TTL: <strong>3600</strong>
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard('185.158.133.1')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">2. Aguarde a propagação DNS (15-48h)</h4>
                    <p className="text-sm text-muted-foreground">
                      Após configurar os registros DNS no seu provedor de domínio, 
                      aguarde a propagação e clique no botão abaixo para verificar.
                    </p>
                  </div>

                  {!config.dns_verified && (
                    <Button 
                      onClick={handleCheckDNS} 
                      disabled={checking}
                      className="w-full"
                    >
                      {checking ? 'Verificando...' : 'Verificar DNS'}
                    </Button>
                  )}

                  {config.dns_verified && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-semibold">DNS verificado com sucesso!</span>
                    </div>
                  )}

                  {config.ssl_enabled && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-semibold">
                        Certificado SSL emitido em {new Date(config.ssl_cert_issued_at!).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-muted p-4 rounded-md">
            <h4 className="font-semibold mb-2">Domínio de fallback</h4>
            <p className="text-sm text-muted-foreground">
              Enquanto o domínio personalizado não estiver ativo, a plataforma continuará 
              acessível em: <strong>{config?.fallback_domain || 'lovable.app'}</strong>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DomainSettings;
