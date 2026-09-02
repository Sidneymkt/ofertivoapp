# 🌟 OFERTIVO - Documentação Técnica

## 🚀 Atualizações Recentes (Janeiro 2025)

### ✅ Sistema de Indicações Corrigido (v2.0)
- **Transações atômicas** para garantir consistência de dados
- **Validação em tempo real** de códigos de indicação
- **Tracking detalhado** de todas as indicações  
- **Tratamento robusto de erros** com logs completos
- **Pontuação automática**: Indicador ganha 100pts, Indicado ganha 50pts
- 📖 [Documentação completa](./docs/REFERRAL_SYSTEM.md)

### 🌐 Domínio Personalizado (v1.0)
- **Configuração simples** via painel administrativo
- **Verificação automática de DNS**
- **Certificado SSL automático** (Let's Encrypt)
- **Zero downtime** durante configuração
- **Fallback seguro** para domínio padrão
- 📖 [Guia de configuração](./docs/CUSTOM_DOMAIN.md)

---

## ✅ Implementado

### **Frontend Completo**
- ✅ Landing page moderna com design amazônico
- ✅ Sistema de autenticação (Login/Cadastro)
- ✅ Feed de ofertas responsivo
- ✅ Sistema de pontos gamificado
- ✅ Design system robusto (Verde floresta + Azul rio + Dourado)

### **Arquitetura Backend**
- ✅ Configuração Supabase completa
- ✅ Hooks personalizados (useAuth, useOffers, usePoints)
- ✅ Serviços integrados:
  - 🗺️ Mapbox (geolocalização)
  - 🤖 Google Gemini AI (marketing)
  - 📱 QR Code (check-ins)

### **Dependências Instaladas**
- `@supabase/supabase-js` - Backend as a Service
- `mapbox-gl` - Mapas interativos
- `qrcode` + `qr-scanner` - Sistema QR
- `@google/generative-ai` - IA para marketing

## 🔐 Chaves de API Necessárias

### **1. Supabase (OBRIGATÓRIO)**
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### **2. Mapbox (Geolocalização)**
```env
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token
```

### **3. Google Gemini (IA Marketing)**
```env
VITE_GEMINI_API_KEY=your_gemini_api_key
```

## 🗄️ Schema do Banco (Supabase)

```sql
-- Tabelas principais já tipadas em src/lib/supabase.ts
- users (perfis de usuários)
- businesses (dados dos negócios)
- offers (ofertas e promoções)
- user_points (sistema de pontuação)
- qr_codes (validação de check-ins)
- reviews (avaliações)
- follows (seguir negócios)
- raffles (sorteios)
- raffle_entries (participações)
```

## 🚀 Próximos Passos

1. **Conectar Supabase**: Clique no botão verde "Supabase" no canto superior direito
2. **Configurar APIs**: Adicione as chaves de API nas variáveis de ambiente
3. **Criar tabelas**: Execute os schemas no Supabase
4. **Testar funcionalidades**: Login, ofertas, pontos, QR codes

## 📱 Páginas Implementadas
- ✅ Home (Landing)
- ✅ Login/Cadastro 
- ✅ Feed de Ofertas
- ✅ Sistema de Pontos
- 🔄 Mapa (estrutura pronta)
- 🔄 QR Scanner (estrutura pronta)
- 🔄 Dashboard Anunciante (estrutura pronta)

**Status**: Frontend completo + Backend estruturado + APIs configuradas
**Próximo**: Conectar Supabase e configurar chaves de API