# Sistema de Indicações (Referrals) - Ofertivo

## Visão Geral

O sistema de indicações permite que usuários e negócios indiquem novos membros para a plataforma e ganhem pontos por isso.

## Funcionalidades

### 1. Código de Indicação
- Cada usuário recebe automaticamente um código de indicação único ao se cadastrar
- O código é gerado a partir do ID do usuário (8 primeiros caracteres em maiúsculo)
- Pode ser compartilhado via link ou manualmente

### 2. Cadastro com Indicação
- Novos usuários podem inserir um código de indicação durante o registro
- O sistema valida o código em tempo real
- Exibe mensagem de confirmação e bônus de pontos

### 3. Recompensas

#### Para o Indicador:
- **100 pontos** por cada indicação bem-sucedida
- Rastreamento detalhado de todas as indicações

#### Para o Indicado:
- **50 pontos** ao se cadastrar com código de indicação
- **25 pontos** ao se cadastrar sem código (bônus padrão)

### 4. Tracking e Analytics
- Tabela `referral_tracking` registra todas as indicações
- Métricas disponíveis:
  - Total de indicações
  - Indicações bem-sucedidas vs. falhas
  - Total de pontos ganhos
  - Breakdown por tipo (usuário vs. negócio)

## Fluxo Técnico

### 1. Registro de Novo Usuário

```typescript
// Frontend envia dados com código de indicação
const userData = {
  full_name: 'João Silva',
  phone: '92999999999',
  user_type: 'consumer',
  referral_code: 'ABC123DE' // Opcional
};

await supabase.auth.signUp({
  email,
  password,
  options: { data: userData }
});
```

### 2. Processamento no Backend

```sql
-- Trigger handle_new_user é ativado automaticamente
-- 1. Valida código de indicação
-- 2. Cria perfil do usuário
-- 3. Credita pontos ao indicador
-- 4. Credita pontos ao indicado
-- 5. Registra tracking
```

### 3. Validação de Código

```typescript
// Validar código antes do registro
const { data } = await supabase.rpc('validate_referral_code', {
  p_code: 'ABC123DE'
});

// Retorna:
{
  valid: true,
  message: 'Código válido',
  referrer_name: 'Maria Silva',
  referrer_type: 'consumer',
  bonus_points: 50
}
```

## Componentes Principais

### Frontend
- `src/pages/Register.tsx` - Formulário de registro com validação
- `src/hooks/useReferralTracking.ts` - Hook para gerenciar tracking
- `src/hooks/useReferrals.ts` - Hook para sistema de comissões (negócios)

### Backend
- `handle_new_user()` - Trigger principal de processamento
- `validate_referral_code()` - Função de validação
- `log_referral_completion()` - Trigger de tracking automático

### Tabelas
- `profiles` - Dados do usuário (inclui `referred_by` e `referral_code`)
- `referral_tracking` - Registro detalhado de indicações
- `user_points` - Histórico de pontos ganhos

## Tratamento de Erros

O sistema possui tratamento robusto de erros:

### 1. Validação Frontend
- Formato de email
- Formato de telefone
- Comprimento mínimo de senha
- Validação de código de indicação

### 2. Validação Backend
- Código de indicação inválido não bloqueia registro
- Erros na atribuição de pontos são logados mas não falham o registro
- Duplicação de perfil é prevenida

### 3. Logs
Todos os eventos são logados no Postgres:
```
RAISE LOG 'Processing new user: %, type: %, referral_code: %'
RAISE LOG 'Referrer found: % for new user: %'
RAISE LOG 'ERROR creating profile for user %: % %'
```

## Testes

### Teste Manual

1. **Cadastro sem código**:
   - Registrar novo usuário sem código
   - Verificar que recebeu 25 pontos de boas-vindas
   - Verificar que código de indicação foi gerado

2. **Cadastro com código válido**:
   - Obter código de usuário existente
   - Registrar novo usuário com o código
   - Verificar que indicado recebeu 50 pontos
   - Verificar que indicador recebeu 100 pontos
   - Verificar registro em `referral_tracking`

3. **Cadastro com código inválido**:
   - Tentar registrar com código inexistente
   - Verificar mensagem de erro
   - Confirmar que registro não é bloqueado

### Teste de Performance
- Sistema suporta múltiplos registros simultâneos
- Transações atômicas previnem race conditions
- Índices otimizam consultas de validação

## Métricas e Monitoramento

### Consultas Úteis

```sql
-- Indicações por usuário
SELECT 
  referrer_id,
  COUNT(*) as total_referrals,
  SUM(referrer_points_awarded) as total_points
FROM referral_tracking
GROUP BY referrer_id
ORDER BY total_referrals DESC;

-- Taxa de conversão de indicações
SELECT 
  COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*) as conversion_rate
FROM referral_tracking;

-- Indicações nos últimos 30 dias
SELECT DATE(created_at) as date, COUNT(*) as referrals
FROM referral_tracking
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## Troubleshooting

### Problema: Usuário não recebeu pontos

**Verificar:**
1. Logs do Postgres para erros
2. Tabela `user_points` para registro
3. Campo `total_points` na tabela `profiles`

**Solução:**
```sql
-- Corrigir pontos manualmente se necessário
UPDATE profiles 
SET total_points = (
  SELECT COALESCE(SUM(points_earned), 0) 
  FROM user_points 
  WHERE user_id = 'USER_ID'
)
WHERE user_id = 'USER_ID';
```

### Problema: Código de indicação não encontrado

**Verificar:**
1. Tabela `profiles` possui coluna `referral_code`
2. Código foi gerado corretamente (trigger `generate_referral_code`)

**Solução:**
```sql
-- Gerar códigos para perfis sem código
UPDATE profiles 
SET referral_code = UPPER(SUBSTRING(MD5(user_id::text), 1, 8))
WHERE referral_code IS NULL;
```

## Roadmap

- [ ] Dashboard de analytics para indicadores
- [ ] Gamificação com níveis de indicação
- [ ] Recompensas especiais para top indicadores
- [ ] API pública para integração externa
- [ ] Webhooks para eventos de indicação
