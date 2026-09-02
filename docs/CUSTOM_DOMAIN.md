# Configuração de Domínio Personalizado - Ofertivo

## Visão Geral

O Ofertivo suporta domínio personalizado, permitindo que você use seu próprio domínio (ex: `ofertas.minhaempresa.com.br`) em vez do domínio padrão da plataforma.

## Funcionalidades

- ✅ Configuração simples via painel administrativo
- ✅ Verificação automática de DNS
- ✅ Emissão automática de certificado SSL (Let's Encrypt)
- ✅ Fallback seguro para domínio padrão
- ✅ Zero downtime durante migração

## Pré-requisitos

1. **Acesso administrativo** à plataforma
2. **Propriedade do domínio** e acesso ao painel DNS
3. **Domínio registrado e ativo**

## Passo a Passo

### 1. Acessar Configurações

1. Faça login como administrador
2. Navegue até **Admin Dashboard** → **Configurações de Domínio**
3. Você verá a interface de configuração de domínio

### 2. Adicionar Domínio

1. Digite seu domínio no campo (ex: `ofertas.minhaempresa.com.br`)
2. Clique em **Salvar**
3. O status mudará para "Aguardando DNS"

### 3. Configurar DNS

Configure os seguintes registros no painel do seu provedor de domínio:

#### Registro A (Principal)
```
Tipo:  A
Nome:  @ (ou deixe em branco para root domain)
       ou subdomínio (ex: ofertas)
Valor: 185.158.133.1
TTL:   3600 (ou 1 hora)
```

#### Registro CNAME (Opcional, para www)
```
Tipo:  CNAME
Nome:  www
Valor: seu-dominio.com.br
TTL:   3600
```

### 4. Aguardar Propagação DNS

- **Tempo médio**: 15 minutos a 2 horas
- **Tempo máximo**: até 48 horas
- Use ferramentas como [DNS Checker](https://dnschecker.org) para verificar

### 5. Verificar DNS

1. Após configurar o DNS, aguarde alguns minutos
2. Clique em **Verificar DNS** na interface
3. Aguarde a verificação (pode levar alguns segundos)

### 6. Certificado SSL

Após a verificação DNS bem-sucedida:

1. O sistema inicia automaticamente a emissão do certificado SSL
2. Processo leva aproximadamente 1-2 minutos
3. Status mudará para "Ativo" quando concluído

## Provedores de Domínio Populares

### Registro.br
1. Acesse [Registro.br](https://registro.br)
2. Entre na gestão do seu domínio
3. Vá em **Configurar DNS** → **Adicionar Registro**
4. Adicione o registro tipo A conforme instruções acima

### GoDaddy
1. Acesse o painel GoDaddy
2. Vá em **Meus Produtos** → **DNS**
3. Clique em **Adicionar** e selecione tipo **A**
4. Preencha conforme instruções

### Hostinger
1. Acesse o painel Hostinger
2. Vá em **Domínios** → Selecione o domínio
3. Clique em **DNS/Nameservers** → **Gerenciar DNS**
4. Adicione novo registro tipo A

### Cloudflare
1. Acesse o painel Cloudflare
2. Selecione o domínio
3. Vá em **DNS** → **Add record**
4. Tipo: A, Nome: @, IPv4: 185.158.133.1
5. **IMPORTANTE**: Desative o proxy laranja (clique para ficar cinza)

## Verificação Manual

### Usando nslookup (Windows/Mac/Linux)
```bash
nslookup seudominio.com.br
```

Deve retornar:
```
Server:  192.168.x.x
Address: 192.168.x.x#53

Name:    seudominio.com.br
Address: 185.158.133.1
```

### Usando dig (Linux/Mac)
```bash
dig seudominio.com.br +short
```

Deve retornar:
```
185.158.133.1
```

### Online
Acesse [DNS Checker](https://dnschecker.org) e verifique se o IP `185.158.133.1` aparece globalmente

## Status do Domínio

### Estados Possíveis

| Status | Descrição | Ação Necessária |
|--------|-----------|-----------------|
| Não configurado | Nenhum domínio salvo | Adicione um domínio |
| Aguardando DNS | DNS ainda não propagado | Configure DNS e aguarde propagação |
| Emitindo SSL | Certificado sendo gerado | Aguarde (1-2 min) |
| Ativo | Domínio funcionando | Nenhuma - tudo OK! |
| Erro | Problema na configuração | Verifique DNS e tente novamente |

## Fallback e Segurança

### Sistema de Fallback
- Enquanto domínio personalizado não estiver ativo, plataforma usa domínio padrão
- Zero downtime durante processo de configuração
- Transição automática quando domínio estiver pronto

### Segurança
- Certificado SSL gratuito via Let's Encrypt
- Renovação automática a cada 90 dias
- HTTPS forçado em todas as requisições
- Proteção contra hijacking de DNS

## Troubleshooting

### DNS não propaga
**Problema**: Após 24h, DNS ainda não verificado

**Soluções**:
1. Verifique se o registro A está correto
2. Confirme que o IP é `185.158.133.1`
3. Remova quaisquer outros registros A conflitantes
4. Se usando Cloudflare, desative o proxy (ícone laranja)
5. Verifique com seu provedor se há restrições

### SSL não emite
**Problema**: DNS verificado mas SSL não emite

**Soluções**:
1. Aguarde mais alguns minutos (pode levar até 5 min)
2. Verifique se não há firewall bloqueando porta 80/443
3. Confirme que domínio está publicamente acessível
4. Entre em contato com suporte se persistir

### Domínio não carrega após ativação
**Problema**: Status "Ativo" mas site não carrega

**Soluções**:
1. Limpe cache do navegador (Ctrl+Shift+Del)
2. Tente em navegador anônimo
3. Verifique se está acessando `https://` (não `http://`)
4. Aguarde mais alguns minutos para cache de DNS

### Erro de certificado SSL
**Problema**: Navegador exibe aviso de certificado

**Soluções**:
1. Aguarde alguns minutos - certificado pode estar propagando
2. Limpe cache do navegador
3. Verifique a data/hora do computador
4. Tente em outro dispositivo/rede

## Suporte

### Verificação de Status
Acesse o painel administrativo para ver:
- Status atual do domínio
- Data de verificação DNS
- Data de emissão do certificado SSL
- Logs de erros (se houver)

### Logs
Todos os eventos são registrados:
```sql
-- Ver configuração atual
SELECT * FROM platform_settings 
WHERE setting_key = 'custom_domain';

-- Ver histórico de atualizações
SELECT * FROM platform_settings 
WHERE setting_key = 'custom_domain'
ORDER BY updated_at DESC;
```

### Remover Domínio Personalizado

Se precisar reverter:

1. Acesse painel administrativo
2. Configure um novo domínio vazio ou
3. Execute SQL direto:

```sql
UPDATE platform_settings 
SET setting_value = jsonb_build_object(
  'domain', null,
  'ssl_enabled', false,
  'dns_verified', false,
  'fallback_domain', 'lovable.app',
  'status', 'not_configured'
)
WHERE setting_key = 'custom_domain';
```

## FAQ

**Q: Posso usar um subdomínio?**  
A: Sim! Ex: `ofertas.minhaempresa.com.br`

**Q: Posso usar múltiplos domínios?**  
A: Atualmente, apenas um domínio personalizado é suportado. Use redirecionamentos no seu provedor de DNS para outros domínios.

**Q: Há custo adicional?**  
A: Não, a funcionalidade é gratuita. Você só paga pelo registro do domínio com seu provedor.

**Q: O que acontece se meu domínio expirar?**  
A: A plataforma automaticamente reverte para o domínio padrão. Renove seu domínio para reativá-lo.

**Q: Posso mudar de domínio depois?**  
A: Sim, basta configurar um novo domínio. O anterior será desativado automaticamente.

**Q: Suporta domínios internacionais (IDN)?**  
A: Sim, mas recomendamos usar a versão ASCII (punycode) para melhor compatibilidade.

## Próximos Passos

Após configurar o domínio com sucesso:

1. ✅ Atualize seus materiais de marketing com novo domínio
2. ✅ Configure redirecionamentos do domínio antigo (se aplicável)
3. ✅ Atualize links em redes sociais e materiais externos
4. ✅ Notifique usuários sobre nova URL (se for mudança significativa)
5. ✅ Configure analytics/tracking com novo domínio
