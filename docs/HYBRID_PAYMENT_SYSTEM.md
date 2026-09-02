# Sistema Híbrido de Pagamentos - Ofertivo

## Visão Geral

O Ofertivo implementa um sistema híbrido de pagamentos com dois gateways:

1. **AbacatePay (PIX)** - Gateway principal
2. **Mercado Pago (Cartão)** - Gateway secundário

## Arquitetura

### Estrutura do Banco de Dados

#### Tabela `transactions`
Armazena todas as transações de pagamento, independente do gateway.

```sql
- id (UUID)
- business_id (UUID)
- subscription_id (UUID, nullable)
- amount (NUMERIC)
- gateway (TEXT: 'abacatepay' | 'mercadopago')
- payment_method (TEXT: 'pix' | 'credit_card' | 'debit_card')
- status (TEXT: 'pending' | 'paid' | 'failed' | 'expired' | 'refunded')
- gateway_transaction_id (TEXT)
- gateway_payment_url (TEXT)
- pix_code (TEXT, para PIX)
- pix_qr_code (TEXT, para QR Code PIX)
- metadata (JSONB)
- transaction_fee (NUMERIC)
- net_revenue (NUMERIC)
- paid_at (TIMESTAMP)
- expires_at (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### Tabela `payment_gateways`
Configuração dos gateways de pagamento.

```sql
- id (UUID)
- gateway_name (TEXT: 'abacatepay' | 'mercadopago')
- is_active (BOOLEAN)
- is_primary (BOOLEAN)
- api_key_encrypted (TEXT)
- webhook_secret (TEXT)
- config (JSONB)
```

#### Tabela `payment_logs`
Logs de todos os eventos de webhook recebidos.

```sql
- id (UUID)
- transaction_id (UUID)
- event_type (TEXT)
- gateway (TEXT)
- payload (JSONB)
- created_at (TIMESTAMP)
```

### Edge Functions

#### 1. `create-payment`
Cria um novo pagamento no gateway selecionado.

**Parâmetros:**
```json
{
  "planId": "uuid-do-plano",
  "gateway": "abacatepay" | "mercadopago",
  "businessId": "uuid-do-negocio"
}
```

**Resposta AbacatePay:**
```json
{
  "success": true,
  "transaction_id": "uuid",
  "payment_url": "https://...",
  "pix_code": "00020126...",
  "pix_qr_code": "data:image/png;base64,...",
  "gateway": "abacatepay"
}
```

**Resposta Mercado Pago:**
```json
{
  "success": true,
  "transaction_id": "uuid",
  "payment_url": "https://...",
  "gateway": "mercadopago"
}
```

#### 2. `abacatepay-webhook`
Processa webhooks do AbacatePay.

**URL:** `https://wogenchxhjipmhfojker.supabase.co/functions/v1/abacatepay-webhook`

**Eventos processados:**
- `billing.paid` - Pagamento confirmado

#### 3. `mercadopago-webhook`
Processa webhooks do Mercado Pago.

**URL:** `https://wogenchxhjipmhfojker.supabase.co/functions/v1/mercadopago-webhook`

**Eventos processados:**
- `payment.created` - Pagamento criado (verifica se foi aprovado)

#### 4. `check-payment-status`
Verifica o status de um pagamento diretamente no gateway.

**Parâmetros:**
```json
{
  "transactionId": "uuid-da-transacao"
}
```

## Configuração

### 1. Secrets Necessários

Configure os seguintes secrets no Supabase:

```bash
# AbacatePay
ABACATEPAY_API_KEY=seu_token_aqui

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=seu_token_aqui
```

### 2. Configurar Webhooks

#### AbacatePay

1. Acesse o painel do AbacatePay
2. Vá em Configurações > Webhooks
3. Adicione a URL: `https://wogenchxhjipmhfojker.supabase.co/functions/v1/abacatepay-webhook`
4. Selecione os eventos: `billing.paid`

#### Mercado Pago

1. Acesse o painel do Mercado Pago
2. Vá em Integrações > Webhooks
3. Adicione a URL: `https://wogenchxhjipmhfojker.supabase.co/functions/v1/mercadopago-webhook`
4. Selecione os eventos: `payment`

## Fluxo de Pagamento

### 1. Usuário Seleciona Plano

```typescript
// Componente usa SubscriptionPlanSelectHybrid
<SubscriptionPlanSelectHybrid 
  businessId={business.id}
  onPlanSelect={(planId, planName) => console.log('Plano selecionado')}
/>
```

### 2. Usuário Escolhe Método de Pagamento

```typescript
// Modal abre com PaymentMethodSelector
<PaymentMethodSelector
  planName="Pro"
  planPrice={59.00}
  onSelectMethod={handlePaymentMethod}
/>
```

### 3. Sistema Cria Pagamento

```typescript
// Hook usePayments
const { createPayment } = usePayments(businessId);

const result = await createPayment(planId, 'abacatepay');
// Ou
const result = await createPayment(planId, 'mercadopago');
```

### 4. Webhook Confirma Pagamento

- Gateway notifica via webhook
- Edge function processa evento
- Status da transação é atualizado
- Assinatura é ativada
- Notificação é enviada ao usuário

### 5. Fallback Automático

Se o pagamento PIX expirar após 10 minutos:

```typescript
const { retryPaymentWithFallback } = usePayments(businessId);

// Tenta automaticamente com o outro gateway
await retryPaymentWithFallback(transactionId);
```

## Taxas e Receitas

### AbacatePay (PIX)
- **Taxa:** 0,99% + R$ 0,10
- **Confirmação:** Instantânea
- **Expiração:** 10 minutos

### Mercado Pago (Cartão)
- **Taxa:** 4,99% + R$ 0,39
- **Confirmação:** 1-2 dias úteis
- **Expiração:** 24 horas

### Cálculo Automático

```sql
-- Calculado automaticamente ao processar pagamento
transaction_fee = (amount * percentage) + fixed_fee
net_revenue = amount - transaction_fee
```

## Relatórios

### Histórico de Pagamentos

```typescript
import { PaymentHistory } from '@/components/PaymentHistory';

<PaymentHistory businessId={business.id} />
```

### Acompanhamento em Tempo Real

```typescript
const { transactions } = usePayments(businessId);

// Atualiza automaticamente via Realtime
useEffect(() => {
  // transactions é atualizado em tempo real
}, [transactions]);
```

## Segurança

### RLS Policies

```sql
-- Usuários veem apenas suas transações
CREATE POLICY "Business owners can view own transactions"
ON transactions FOR SELECT
USING (business_id IN (
  SELECT id FROM businesses WHERE owner_id = auth.uid()
));

-- Sistema pode criar/atualizar transações
CREATE POLICY "System can manage transactions"
ON transactions FOR ALL
USING (true);
```

### Validação de Webhooks

```typescript
// Todos os webhooks são registrados
await supabase.from('payment_logs').insert({
  event_type: payload.event,
  gateway: 'abacatepay',
  payload: payload
});
```

## Troubleshooting

### Pagamento não confirmado

1. Verificar logs do webhook:
```sql
SELECT * FROM payment_logs 
WHERE gateway = 'abacatepay' 
ORDER BY created_at DESC 
LIMIT 10;
```

2. Verificar status da transação:
```typescript
const status = await checkPaymentStatus(transactionId);
```

3. Forçar verificação:
```sql
SELECT process_payment_confirmation('transaction-uuid');
```

### Webhook não recebido

1. Verificar URL do webhook no painel do gateway
2. Verificar logs da edge function no Supabase
3. Testar webhook manualmente com Postman

## Monitoramento

### Métricas Importantes

```sql
-- Total de transações por status
SELECT status, COUNT(*) 
FROM transactions 
GROUP BY status;

-- Receita líquida por gateway
SELECT gateway, SUM(net_revenue) 
FROM transactions 
WHERE status = 'paid'
GROUP BY gateway;

-- Taxa de conversão
SELECT 
  gateway,
  COUNT(*) FILTER (WHERE status = 'paid') * 100.0 / COUNT(*) as conversion_rate
FROM transactions
GROUP BY gateway;
```

## Próximos Passos

- [ ] Implementar assinatura recorrente automática
- [ ] Adicionar suporte a parcelamento no Mercado Pago
- [ ] Implementar sistema de reembolso
- [ ] Adicionar dashboard de métricas financeiras para admin
- [ ] Implementar alertas de pagamento vencido
- [ ] Adicionar suporte a cupons de desconto
