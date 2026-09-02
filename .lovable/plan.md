# Plano: Ajuste Dinâmico do Campo de Endereço na Edição de Ofertas

O usuário solicitou que o campo de endereço na tela de edição de ofertas (`EditOffer.tsx`) seja movido para baixo do botão de "Modo Delivery" e que sua exibição seja condicionada à desativação desse modo.

## Alterações Propostas

### Frontend

#### `src/pages/EditOffer.tsx`
- **Remover** o bloco de "Localização da Oferta" da sua posição atual (acima das configurações de preço/condição).
- **Inserir** o componente `GooglePlacesAutocomplete` logo abaixo do bloco de "Modo Delivery".
- **Adicionar lógica condicional** `{!formData.isDelivery && ...}` para garantir que o campo de endereço só apareça quando o Modo Delivery estiver desativado.
- **Ajustar estilos** para manter a consistência visual e o espaçamento adequado.

## Detalhes Técnicos
- O campo `isDelivery` já existe no estado `formData`.
- O componente `GooglePlacesAutocomplete` já está configurado para atualizar `address`, `latitude` e `longitude`.
- A mudança é puramente de UI/UX para melhorar o fluxo de preenchimento, refletindo a lógica de que em entregas (delivery) o endereço físico da oferta é irrelevante para o check-in (que ocorre no cliente).

## Validação
- Abrir a tela de edição de uma oferta existente.
- Verificar se o campo de endereço está oculto quando o "Modo Delivery" estiver ativado.
- Verificar se o campo de endereço aparece logo abaixo do switch quando o "Modo Delivery" estiver desativado.
- Confirmar que a seleção de um novo endereço continua funcionando e sendo persistida ao salvar.
