# Correção do check-in + pontuação automática no delivery

## O problema confirmado

O erro "permission denied for function process_qr_validation" acontece porque as permissões de execução dessas funções foram removidas do papel `authenticated` numa rodada anterior de segurança. Consultando o banco, hoje só `postgres` e `service_role` podem executar:

- `process_qr_validation` (as duas versões: a do cliente e a do anunciante)
- `validate_checkin` (as duas versões)

Ou seja: nenhum check-in funciona hoje, nem pelo app do consumidor nem pelo painel do anunciante.

## O que será feito

### 1. Restaurar o check-in com segurança

Devolver a permissão de execução ao usuário logado, mas com autorização checada dentro da própria função (não basta liberar):

- Versão do consumidor: só permite check-in para o próprio usuário logado.
- Versão do anunciante: só permite validar se quem chama é o dono do negócio da oferta (ou administrador).
- Manter a versão para `service_role` intacta.
- Continua bloqueado para visitantes não logados.

### 2. Modo delivery: pontuação ao confirmar a entrega

Regra definida: no delivery não há QR nem verificação de distância. O cliente é pontuado quando o anunciante confirma a entrega/pedido no painel.

- Nova função de servidor `confirm_delivery_checkin(oferta, cliente)` que:
  - valida que quem chama é o dono do negócio da oferta;
  - exige que a oferta esteja em modo delivery, ativa e dentro da validade;
  - impede pontuar o mesmo cliente duas vezes no mesmo dia para a mesma oferta;
  - registra o check-in normalmente (mesmas tabelas de hoje) marcando a origem como "delivery";
  - credita os pontos de check-in da oferta ao cliente e dispara a notificação padrão;
  - nunca pontua perfis de anunciante (regra atual da plataforma).
- Sem redução de pontos por distância no delivery.

### 3. Painel do anunciante

- No painel de pedidos (Pagamentos PIX / pedidos da oferta), pedidos de ofertas em modo delivery ganham o botão **"Confirmar entrega e pontuar"**, que chama a nova função e mostra os pontos creditados.
- No modal de validação de check-in, quando a oferta for delivery, em vez de pedir QR o modal mostra a lista de clientes pendentes com um botão para pontuar.
- Estados claros: já pontuado hoje, sem permissão, erro de rede.

### 4. Ajustes no app do consumidor

- Em oferta delivery, o botão de check-in explica que a pontuação é liberada pelo anunciante ao confirmar a entrega, em vez de abrir a câmera.
- Mensagens de erro deixam de mostrar texto técnico de banco de dados.

## Detalhes técnicos

- Uma migração: `GRANT EXECUTE` para `authenticated` nas 4 assinaturas envolvidas, com checagem de `auth.uid()` e de propriedade dentro de cada função; criação de `public.confirm_delivery_checkin` (SECURITY DEFINER, `search_path=public`), com grant apenas para `authenticated` e `service_role`.
- Reuso dos eventos `checkinValidated` / `pointsUpdated` para atualização em tempo real.
- Arquivos afetados: `src/components/business/CheckinValidationModal.tsx`, `src/components/business/OfferOrdersPanel.tsx`, `src/components/CheckinModal.tsx`, `src/hooks/useCheckinValidation.ts`, `src/components/RecentCheckinsCard.tsx`.
