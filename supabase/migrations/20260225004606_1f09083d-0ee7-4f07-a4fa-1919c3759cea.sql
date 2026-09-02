
-- Table for email funnel templates (sequences)
CREATE TABLE public.email_funnel_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_type TEXT NOT NULL CHECK (funnel_type IN ('consumer', 'business')),
  step_order INTEGER NOT NULL,
  delay_days INTEGER NOT NULL DEFAULT 0,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  message_html TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (funnel_type, step_order)
);

-- Table to track which funnel emails have been sent to each user
CREATE TABLE public.email_funnel_sent (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  template_id UUID NOT NULL REFERENCES public.email_funnel_templates(id) ON DELETE CASCADE,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  UNIQUE (user_id, template_id)
);

-- RLS policies
ALTER TABLE public.email_funnel_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_funnel_sent ENABLE ROW LEVEL SECURITY;

-- Admin can manage templates
CREATE POLICY "Admins can manage funnel templates" ON public.email_funnel_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_active = true AND role = 'master')
  );

-- Admin can view sent records
CREATE POLICY "Admins can view funnel sent records" ON public.email_funnel_sent
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_active = true AND role = 'master')
  );

-- Service role can insert sent records (for edge function)
CREATE POLICY "Service can insert sent records" ON public.email_funnel_sent
  FOR INSERT WITH CHECK (true);

-- Insert default consumer funnel templates
INSERT INTO public.email_funnel_templates (funnel_type, step_order, delay_days, subject, message, message_html) VALUES
('consumer', 1, 0, '👋 Boas-vindas ao Ofertivo, {{nome}}!', 
'Olá, {{nome}}!

Seja bem-vindo(a) à comunidade Ofertivo! Estamos felizes em tê-lo(a) conosco. 🎉

O Ofertivo foi criado para conectar você às melhores ofertas, sorteios e oportunidades dos negócios locais, tudo em um só lugar. Aqui você pode:

✅ Encontrar ofertas perto de você
✅ Ganhar pontos ao interagir e comprar
✅ Participar de sorteios e campanhas especiais
✅ Apoiar ações solidárias e vaquinhas

Explore o app e descubra tudo que preparamos para você!

Equipe Ofertivo', NULL),

('consumer', 2, 1, '🗺️ Descubra ofertas perto de você, {{nome}}!', 
'Olá, {{nome}}!

Você sabia que pode encontrar ofertas incríveis bem pertinho de você? 📍

Use o mapa interativo do Ofertivo para descobrir promoções exclusivas em tempo real. É só abrir o app e ver os pins com as melhores ofertas do seu bairro!

💡 Dica: Ative as notificações para receber alertas de ofertas relâmpago quando estiver por perto.

Não perca as oportunidades ao seu redor!

Equipe Ofertivo', NULL),

('consumer', 3, 3, '⭐ Ganhe pontos e troque por recompensas!', 
'Olá, {{nome}}!

Já começou a acumular pontos no Ofertivo? Cada interação vale! 🏆

Como ganhar pontos:
🔸 Faça check-in em ofertas
🔸 Compartilhe ofertas com amigos
🔸 Convide amigos para a plataforma
🔸 Avalie estabelecimentos

Seus pontos podem ser trocados por recompensas exclusivas e bilhetes para sorteios incríveis! 🎁

Acesse sua carteira de pontos e veja seu saldo.

Equipe Ofertivo', NULL),

('consumer', 4, 7, '🎟️ Sorteios exclusivos esperam por você!', 
'Olá, {{nome}}!

Você já conferiu os sorteios ativos no Ofertivo? 🎰

Participe usando seus pontos acumulados e concorra a prêmios incríveis de negócios locais. Quanto mais pontos, mais bilhetes você pode adquirir!

Acesse agora a seção de Sorteios e tente a sorte! 🍀

Equipe Ofertivo', NULL),

('consumer', 5, 14, '💰 Ofertas imperdíveis para você, {{nome}}!', 
'Olá, {{nome}}!

Faz duas semanas que você está no Ofertivo e queremos garantir que está aproveitando ao máximo! 🚀

Confira as ofertas mais populares da semana e não deixe passar as oportunidades exclusivas da sua região.

Lembre-se: compartilhar ofertas com amigos também gera pontos extras! 🎯

Continue economizando com o Ofertivo!

Equipe Ofertivo', NULL),

-- Business funnel templates
('business', 1, 0, '🎉 Bem-vindo ao Ofertivo, {{nome}}! Seu negócio vai decolar!', 
'Olá, {{nome}}!

Parabéns por cadastrar seu negócio no Ofertivo! 🚀

Você acaba de dar um passo importante para aumentar a visibilidade do seu estabelecimento e atrair mais clientes usando tecnologia, gamificação e marketing inteligente.

O que você pode fazer agora:
✅ Criar sua primeira oferta
✅ Configurar seu perfil comercial
✅ Conhecer o painel de gestão

Estamos aqui para ajudar no que precisar!

Equipe Ofertivo', NULL),

('business', 2, 1, '📢 Crie sua primeira oferta e atraia clientes!', 
'Olá, {{nome}}!

Chegou a hora de criar sua primeira oferta no Ofertivo! 🎯

Com poucos cliques você coloca sua promoção no mapa e alcança consumidores que estão buscando exatamente o que você oferece.

💡 Dicas para uma oferta de sucesso:
🔸 Use fotos atraentes do seu produto/serviço
🔸 Ofereça um desconto real e significativo
🔸 Defina um prazo para criar urgência
🔸 Use nossa IA para gerar títulos e descrições persuasivas

Acesse seu painel e crie agora!

Equipe Ofertivo', NULL),

('business', 3, 3, '📊 Conheça suas métricas e otimize resultados!', 
'Olá, {{nome}}!

Seu painel do Ofertivo é uma central de inteligência para seu negócio! 📈

No dashboard você acompanha:
🔸 Visualizações das suas ofertas
🔸 Número de check-ins realizados
🔸 Engajamento dos clientes
🔸 Desempenho comparativo

Use esses dados para criar ofertas cada vez mais assertivas e aumentar seu retorno.

Acesse suas métricas agora!

Equipe Ofertivo', NULL),

('business', 4, 7, '🏆 Sorteios e gamificação: fidelize seus clientes!', 
'Olá, {{nome}}!

Já pensou em usar sorteios para atrair e fidelizar clientes? 🎰

No Ofertivo, você pode criar sorteios vinculados ao seu negócio. Seus clientes acumulam pontos a cada interação e usam para participar — gerando tráfego recorrente!

Benefícios dos sorteios:
🔸 Aumento do engajamento
🔸 Mais visitas ao seu estabelecimento
🔸 Fidelização natural
🔸 Marketing boca a boca

Descubra como criar seu primeiro sorteio!

Equipe Ofertivo', NULL),

('business', 5, 14, '🚀 Maximize seus resultados com o plano ideal!', 
'Olá, {{nome}}!

Já faz duas semanas que seu negócio está no Ofertivo. Como estão os resultados? 📊

Se você quer ir ainda mais longe, conheça nossos planos com recursos avançados:

⭐ Mais ofertas simultâneas
⭐ Analytics detalhados
⭐ CRM integrado
⭐ Prioridade no mapa
⭐ Suporte prioritário

Compare os planos e escolha o melhor para o seu momento. Investimento a partir de R$ 49,90/mês.

Conte com a gente para crescer!

Equipe Ofertivo', NULL);
