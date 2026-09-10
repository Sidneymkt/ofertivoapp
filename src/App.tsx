import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import { ScrollToTop } from "./components/ScrollToTop";
import { AuthProvider } from "./contexts/AuthContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { MessageNotificationProvider } from "./components/MessageNotificationProvider";
import { InstallPrompt } from "./components/InstallPrompt";
import { UpdatePrompt } from "./components/UpdatePrompt";
import { RoutePrefetcher } from "./components/RoutePrefetcher";
import { RouteFallback } from "./components/RouteFallback";
import { getMapboxToken } from "./lib/mapTokenCache";

// Prefetch map token so it's ready when user navigates to map
getMapboxToken();
// Lazy load all pages including Home and Map for better CSS code splitting
const Home = lazy(() => import("./pages/Home"));
const Map = lazy(() => import("./pages/Map"));

// Lazy load pages for better performance
const Offers = lazy(() => import("./pages/Offers"));
const Points = lazy(() => import("./pages/Points"));
const Profile = lazy(() => import("./pages/Profile"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Login = lazy(() => import("./pages/Login"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));

const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const OfferDetails = lazy(() => import("./pages/OfferDetails"));
const CreateOffer = lazy(() => import("./pages/CreateOffer"));
const EditOffer = lazy(() => import("./pages/EditOffer"));
const BusinessDashboard = lazy(() => import("./pages/BusinessDashboard"));
const BusinessOffers = lazy(() => import("./pages/BusinessOffers"));
const BusinessProfile = lazy(() => import("./pages/BusinessProfile"));
const BusinessRaffles = lazy(() => import("./pages/BusinessRaffles"));
const BusinessCRM = lazy(() => import("./pages/BusinessCRM"));
const BusinessSupport = lazy(() => import("./pages/BusinessSupport"));
const BusinessPlanUpgrade = lazy(() => import("./pages/BusinessPlanUpgrade"));
const BusinessReferrals = lazy(() => import("./pages/BusinessReferrals"));
const AdminReferrals = lazy(() => import("./pages/AdminReferrals"));
const PublicBusinessProfile = lazy(() => import("./pages/PublicBusinessProfile"));
const PublicUserProfile = lazy(() => import("./pages/PublicUserProfile"));
const Raffles = lazy(() => import("./pages/Raffles"));
const MyRaffles = lazy(() => import("./pages/MyRaffles"));
const Support = lazy(() => import("./pages/Support"));
const Terms = lazy(() => import("./pages/Terms"));
const Notifications = lazy(() => import("./pages/Notifications"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const BusinessAchievements = lazy(() => import("./pages/BusinessAchievements").then(m => ({ default: m.BusinessAchievements })));
const BusinessMessages = lazy(() => import("./pages/BusinessMessages"));
const UserMessages = lazy(() => import("./pages/UserMessages"));
const RaffleDetails = lazy(() => import("./pages/RaffleDetails"));
const PublicRaffleResult = lazy(() => import("./pages/PublicRaffleResult"));
const Referrals = lazy(() => import("./pages/Referrals"));
const ReferralChoice = lazy(() => import("./pages/ReferralChoice"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const BusinessPayments = lazy(() => import("./pages/BusinessPayments"));
const Crowdfunding = lazy(() => import("./pages/Crowdfunding"));
const CampaignDetails = lazy(() => import("./pages/CampaignDetails"));
const MyCampaigns = lazy(() => import("./pages/MyCampaigns"));
const Community = lazy(() => import("./pages/Community"));
const Install = lazy(() => import("./pages/Install"));
const Transparencia = lazy(() => import("./pages/Transparencia"));
const BusinessSponsorships = lazy(() => import("./pages/BusinessSponsorships"));
const BusinessWallet = lazy(() => import("./pages/BusinessWallet"));
const BusinessAdvantages = lazy(() => import("./pages/BusinessAdvantages"));
const AnuncieAqui = lazy(() => import("./pages/AnuncieAqui"));
const NearbyCustomersMap = lazy(() => import("./pages/NearbyCustomersMap"));
const BusinessPixPayments = lazy(() => import("./pages/BusinessPixPayments"));

// Optimized QueryClient configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

const OfferRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/ofertas/${id}`} replace />;
};

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ErrorBoundary>
              <AuthProvider>
                <InstallPrompt />
                <UpdatePrompt />
                <MessageNotificationProvider />
                <ScrollToTop />
                <RoutePrefetcher />
              <Suspense fallback={<RouteFallback />}>
              <Routes>
              {/* Redirect helper for legacy singular URL */}
            {/* Rotas públicas existentes */}
            <Route path="/" element={<Home />} />
            <Route path="/mapa" element={<Map />} />
            <Route path="/ofertas" element={<Offers />} />
            <Route path="/ofertas/:id" element={<OfferDetails />} />
            <Route path="/oferta/:id" element={<OfferRedirect />} />
            <Route path="/pontos" element={<Points />} />
            <Route path="/sorteios" element={<Raffles />} />
            <Route path="/sorteios/:id" element={<RaffleDetails />} />
           <Route path="/vaquinhas" element={<Crowdfunding />} />
           <Route path="/vaquinhas/:id" element={<CampaignDetails />} />
           <Route path="/minhas-vaquinhas" element={<MyCampaigns />} />
            <Route path="/comunidade" element={<Community />} />
            <Route path="/instalar" element={<Install />} />
            <Route path="/sorteio-resultado/:id" element={<PublicRaffleResult />} />
            <Route path="/meus-sorteios" element={<MyRaffles />} />
            <Route path="/perfil" element={<Profile />} />
            <Route path="/favoritos" element={<Favorites />} />
           <Route path="/login" element={<Login />} />
           <Route path="/auth/callback" element={<AuthCallback />} />
           <Route path="/cadastro" element={<Register />} />

            <Route path="/recuperar-senha" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/redefinir-senha" element={<ResetPassword />} />
            <Route path="/cadastro/consumidor" element={<Register />} />
            <Route path="/cadastro/negocio" element={<Register />} />
            
            {/* Rotas Business existentes */}
            <Route path="/dashboard" element={<BusinessDashboard />} />
            <Route path="/dashboard/ofertas" element={<BusinessOffers />} />
            <Route path="/dashboard/ofertas/criar" element={<CreateOffer />} />
            <Route path="/dashboard/perfil" element={<BusinessProfile />} />
            <Route path="/dashboard/sorteios" element={<BusinessRaffles />} />
            <Route path="/dashboard/clientes" element={<BusinessCRM />} />
            <Route path="/dashboard/suporte" element={<BusinessSupport />} />
            <Route path="/dashboard/plano" element={<BusinessPlanUpgrade />} />
            <Route path="/dashboard/indicacoes" element={<BusinessReferrals />} />
            <Route path="/dashboard/conquistas" element={<BusinessAchievements />} />
            
            {/* Admin */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/indicacoes" element={<AdminReferrals />} />
            
            {/* Referral System */}
            <Route path="/indicacoes" element={<Referrals />} />
            <Route path="/indicacao" element={<ReferralChoice />} />
            
            {/* Perfis públicos */}
            <Route path="/negocio/:id" element={<PublicBusinessProfile />} />
            <Route path="/loja/:slug" element={<PublicBusinessProfile />} />
            <Route path="/usuario/:id" element={<PublicUserProfile />} />
            
            {/* Outras */}
            <Route path="/suporte" element={<Support />} />
            <Route path="/termos" element={<Terms />} />
            <Route path="/mensagens" element={<UserMessages />} />
            <Route path="/notificacoes" element={<Notifications />} />

            {/* ALIASES para rotas do anunciante (/anunciante/...) */}
            <Route path="/anunciante/login" element={<Login />} />
            <Route path="/anunciante/cadastro" element={<Register />} />
            <Route path="/anunciante/dashboard" element={<BusinessDashboard />} />
            <Route path="/anunciante/painel" element={<BusinessDashboard />} />
            <Route path="/anunciante/ofertas" element={<BusinessOffers />} />
            <Route path="/anunciante/ofertas/nova" element={<CreateOffer />} />
            <Route path="/anunciante/ofertas/editar/:id" element={<EditOffer />} />
            <Route path="/anunciante/perfil" element={<BusinessProfile />} />
            <Route path="/anunciante/sorteios" element={<BusinessRaffles />} />
            <Route path="/anunciante/crm" element={<BusinessCRM />} />
            <Route path="/anunciante/suporte" element={<BusinessSupport />} />
            <Route path="/anunciante/planos" element={<BusinessPlanUpgrade />} />
            <Route path="/anunciante/pagamentos" element={<BusinessPayments />} />
            <Route path="/anunciante/pagamento-sucesso" element={<PaymentSuccess />} />
            <Route path="/anunciante/indicacoes" element={<BusinessReferrals />} />
            <Route path="/anunciante/conquistas" element={<BusinessAchievements />} />
            <Route path="/anunciante/patrocinios" element={<BusinessSponsorships />} />
            <Route path="/anunciante/carteira" element={<BusinessWallet />} />
            <Route path="/anunciante/vantagens" element={<BusinessAdvantages />} />
            <Route path="/anunciante/mensagens" element={<BusinessMessages />} />
            <Route path="/anunciante/radar-clientes" element={<NearbyCustomersMap />} />
            <Route path="/dashboard/radar-clientes" element={<NearbyCustomersMap />} />
            <Route path="/anunciante/pix" element={<BusinessPixPayments />} />
            <Route path="/dashboard/pix" element={<BusinessPixPayments />} />
            <Route path="/business/messages" element={<BusinessMessages />} />
            <Route path="/anuncie" element={<AnuncieAqui />} />
            <Route path="/transparencia" element={<Transparencia />} />
            <Route path="/dashboard/mensagens" element={<BusinessMessages />} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
              </AuthProvider>
            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
