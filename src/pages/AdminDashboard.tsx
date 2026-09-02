import React, { useState, Suspense, lazy } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Building2, 
  Gift, 
  DollarSign, 
  Bell, 
  BarChart3,
  Settings,
  Shield,
  Crown,
  Eye,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Menu,
  LogOut,
  Home,
  Heart,
  Wallet,
  Mail,
  QrCode,
  Image as ImageIcon
} from 'lucide-react';

// Lazy load heavy admin panels to speed up initial dashboard load.
// Loaders are kept as refs so we can prefetch on hover/focus.
const loaders = {
  users: () => import('@/components/admin/AdminUserManagement'),
  businesses: () => import('@/components/admin/AdminBusinessManagement'),
  offers: () => import('@/components/admin/AdminOfferManagement'),
  raffles: () => import('@/components/admin/AdminRaffleManagement'),
  crowdfunding: () => import('@/components/admin/AdminCrowdfundingManagement'),
  fundosocial: () => import('@/components/admin/AdminFundoSocial'),
  financial: () => import('@/components/admin/AdminFinancialManagement'),
  notifications: () => import('@/components/admin/AdminNotificationCenter'),
  reports: () => import('@/components/admin/AdminReports'),
  settings: () => import('@/components/admin/AdminSettings'),
  kpi: () => import('@/components/admin/AdminKPIDashboard'),
  emailMarketing: () => import('@/components/admin/AdminEmailMarketing'),
  emailFunnels: () => import('@/components/admin/AdminEmailFunnels'),
  pixDonations: () => import('@/components/admin/AdminPixDonations'),
  community: () => import('@/components/admin/AdminCommunityHighlights'),
  banners: () => import('@/components/admin/AdminSponsoredBanners'),
  notificationDemo: () => import('@/components/NotificationDemo'),
} as const;

const prefetch = (key: keyof typeof loaders) => {
  loaders[key]().catch(() => {});
};

const AdminUserManagement = lazy(() => loaders.users().then(m => ({ default: m.AdminUserManagement })));
const AdminBusinessManagement = lazy(() => loaders.businesses().then(m => ({ default: m.AdminBusinessManagement })));
const AdminOfferManagement = lazy(() => loaders.offers().then(m => ({ default: m.AdminOfferManagement })));
const AdminRaffleManagement = lazy(() => loaders.raffles().then(m => ({ default: m.AdminRaffleManagement })));
const AdminCrowdfundingManagement = lazy(() => loaders.crowdfunding().then(m => ({ default: m.AdminCrowdfundingManagement })));
const AdminFundoSocial = lazy(() => loaders.fundosocial().then(m => ({ default: m.AdminFundoSocial })));
const AdminFinancialManagement = lazy(() => loaders.financial().then(m => ({ default: m.AdminFinancialManagement })));
const AdminNotificationCenter = lazy(() => loaders.notifications().then(m => ({ default: m.AdminNotificationCenter })));
const AdminReports = lazy(() => loaders.reports().then(m => ({ default: m.AdminReports })));
const AdminSettings = lazy(() => loaders.settings().then(m => ({ default: m.AdminSettings })));
const AdminKPIDashboard = lazy(() => loaders.kpi().then(m => ({ default: m.AdminKPIDashboard })));
const AdminEmailMarketing = lazy(() => loaders.emailMarketing().then(m => ({ default: m.AdminEmailMarketing })));
const AdminEmailFunnels = lazy(() => loaders.emailFunnels().then(m => ({ default: m.AdminEmailFunnels })));
const AdminPixDonations = lazy(() => loaders.pixDonations().then(m => ({ default: m.AdminPixDonations })));
const AdminCommunityHighlights = lazy(() => loaders.community().then(m => ({ default: m.AdminCommunityHighlights })));
const AdminSponsoredBanners = lazy(() => loaders.banners().then(m => ({ default: m.AdminSponsoredBanners })));
const NotificationDemo = lazy(() => loaders.notificationDemo());

import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';

const PanelFallback = () => (
  <div className="space-y-4">
    <Skeleton className="h-10 w-1/3" />
    <Skeleton className="h-64 w-full" />
  </div>
);


export const AdminDashboard = () => {
  const { isAdmin, adminLevel, loading, user } = useAdminAuth();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleBackToSite = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50">
      {/* Header - Mobile Responsive */}
      <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex h-14 sm:h-16 items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
              <Crown className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-primary flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-lg lg:text-xl font-bold truncate">Painel Master</h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block truncate">Ofertivo SaaS Admin</p>
              </div>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-3 flex-shrink-0">
              <Badge variant={adminLevel === 'master' ? 'default' : 'secondary'} className="text-xs px-2 py-1">
                <Shield className="w-3 h-3 mr-1" />
                <span className="hidden xs:inline">{adminLevel?.toUpperCase()}</span>
              </Badge>
              <div className="text-right min-w-0 hidden lg:block">
                <p className="font-medium text-sm truncate max-w-32">{user?.email}</p>
                <p className="text-xs text-muted-foreground">Administrador</p>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToSite}
                  className="px-2 sm:px-3"
                  title="Voltar ao site"
                >
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline ml-1">Site</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="px-2 sm:px-3"
                  title="Sair"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline ml-1">Sair</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6 pb-20 sm:pb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3 sm:space-y-4 lg:space-y-6">
          {/* Mobile and Tablet Menu - Sliding Panel */}
          <div className="lg:hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-lg">
                  {activeTab === 'dashboard' && 'Dashboard'}
                  {activeTab === 'users' && 'Usuários'}
                  {activeTab === 'businesses' && 'Negócios'}
                  {activeTab === 'offers' && 'Ofertas'}
                  {activeTab === 'raffles' && 'Sorteios'}
                  {activeTab === 'crowdfunding' && 'Vaquinhas'}
                  {activeTab === 'fundosocial' && 'Fundo Social'}
                  {activeTab === 'financial' && 'Financeiro'}
                  {activeTab === 'notifications' && 'Notificações'}
                  {activeTab === 'reports' && 'Relatórios'}
                  {activeTab === 'settings' && 'Configurações'}
                  {activeTab === 'marketing' && 'Marketing'}
                  {activeTab === 'pix-donations' && 'Doações PIX'}
                  {activeTab === 'community' && 'Comunidade'}
                  {activeTab === 'banners' && 'Banners'}

                </h2>
              </div>
              
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 p-0">
                  <SheetHeader className="p-6 pb-4">
                    <SheetTitle className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-primary" />
                      Menu de Navegação
                    </SheetTitle>
                  </SheetHeader>
                  <div className="px-6 pb-6">
                    <nav className="space-y-2">
                      <Button
                        variant={activeTab === 'dashboard' ? 'default' : 'ghost'}
                        className="w-full justify-start gap-3"
                        onClick={() => {
                          setActiveTab('dashboard');
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <BarChart3 className="w-4 h-4" />
                        Dashboard
                      </Button>
                      <Button
                        variant={activeTab === 'users' ? 'default' : 'ghost'}
                        className="w-full justify-start gap-3"
                        onClick={() => {
                          setActiveTab('users');
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <Users className="w-4 h-4" />
                        Usuários
                      </Button>
                      <Button
                        variant={activeTab === 'businesses' ? 'default' : 'ghost'}
                        className="w-full justify-start gap-3"
                        onClick={() => {
                          setActiveTab('businesses');
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <Building2 className="w-4 h-4" />
                        Negócios
                      </Button>
                      <Button
                        variant={activeTab === 'offers' ? 'default' : 'ghost'}
                        className="w-full justify-start gap-3"
                        onClick={() => {
                          setActiveTab('offers');
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <Gift className="w-4 h-4" />
                        Ofertas
                      </Button>
                      <Button
                        variant={activeTab === 'raffles' ? 'default' : 'ghost'}
                        className="w-full justify-start gap-3"
                        onClick={() => {
                          setActiveTab('raffles');
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                        Sorteios
                      </Button>
                      <Button
                        variant={activeTab === 'crowdfunding' ? 'default' : 'ghost'}
                        className="w-full justify-start gap-3"
                        onClick={() => {
                          setActiveTab('crowdfunding');
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <Heart className="w-4 h-4" />
                        Vaquinhas
                      </Button>
                      <Button
                        variant={activeTab === 'fundosocial' ? 'default' : 'ghost'}
                        className="w-full justify-start gap-3"
                        onClick={() => {
                          setActiveTab('fundosocial');
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <Wallet className="w-4 h-4" />
                        Fundo Social
                      </Button>
                      <Button
                        variant={activeTab === 'financial' ? 'default' : 'ghost'}
                        className="w-full justify-start gap-3"
                        onClick={() => {
                          setActiveTab('financial');
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <DollarSign className="w-4 h-4" />
                        Financeiro
                      </Button>
                      <Button
                        variant={activeTab === 'notifications' ? 'default' : 'ghost'}
                        className="w-full justify-start gap-3"
                        onClick={() => {
                          setActiveTab('notifications');
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <Bell className="w-4 h-4" />
                        Notificações
                      </Button>
                      <Button
                        variant={activeTab === 'reports' ? 'default' : 'ghost'}
                        className="w-full justify-start gap-3"
                        onClick={() => {
                          setActiveTab('reports');
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <TrendingUp className="w-4 h-4" />
                        Relatórios
                      </Button>
                      <Button
                        variant={activeTab === 'settings' ? 'default' : 'ghost'}
                        className="w-full justify-start gap-3"
                        onClick={() => {
                          setActiveTab('settings');
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <Settings className="w-4 h-4" />
                        Configurações
                      </Button>
                      <Button
                        variant={activeTab === 'marketing' ? 'default' : 'ghost'}
                        className="w-full justify-start gap-3"
                        onClick={() => {
                          setActiveTab('marketing');
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <Mail className="w-4 h-4" />
                        Marketing
                      </Button>
                      <Button
                        variant={activeTab === 'pix-donations' ? 'default' : 'ghost'}
                        className="w-full justify-start gap-3"
                        onClick={() => {
                          setActiveTab('pix-donations');
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <QrCode className="w-4 h-4" />
                        Doações PIX
                      </Button>
                      <Button
                        variant={activeTab === 'community' ? 'default' : 'ghost'}
                        className="w-full justify-start gap-3"
                        onClick={() => {
                          setActiveTab('community');
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <Users className="w-4 h-4" />
                        Comunidade
                      </Button>
                      <Button
                        variant={activeTab === 'banners' ? 'default' : 'ghost'}
                        className="w-full justify-start gap-3"
                        onClick={() => {
                          setActiveTab('banners');
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <ImageIcon className="w-4 h-4" />
                        Banners
                      </Button>
                    </nav>

                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Desktop Tabs - Horizontal Scroll */}
          <div className="hidden lg:block">
            <div className="overflow-x-auto pb-2 -mx-3 px-3 sm:-mx-4 sm:px-4">
              <TabsList className="inline-flex w-max min-w-full gap-1 bg-muted rounded-lg p-1">
                <TabsTrigger value="dashboard" onMouseEnter={() => prefetch('kpi')} onFocus={() => prefetch('kpi')} className="flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap">
                  <BarChart3 className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden md:inline">Dashboard</span>
                </TabsTrigger>
                <TabsTrigger value="users" onMouseEnter={() => prefetch('users')} onFocus={() => prefetch('users')} className="flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap">
                  <Users className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden md:inline">Usuários</span>
                </TabsTrigger>
                <TabsTrigger value="businesses" onMouseEnter={() => prefetch('businesses')} onFocus={() => prefetch('businesses')} className="flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap">
                  <Building2 className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden md:inline">Negócios</span>
                </TabsTrigger>
                <TabsTrigger value="offers" onMouseEnter={() => prefetch('offers')} onFocus={() => prefetch('offers')} className="flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap">
                  <Gift className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden md:inline">Ofertas</span>
                </TabsTrigger>
                <TabsTrigger value="raffles" onMouseEnter={() => prefetch('raffles')} onFocus={() => prefetch('raffles')} className="flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap">
                  <Eye className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden md:inline">Sorteios</span>
                </TabsTrigger>
                <TabsTrigger value="crowdfunding" onMouseEnter={() => prefetch('crowdfunding')} onFocus={() => prefetch('crowdfunding')} className="flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap">
                  <Heart className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden md:inline">Vaquinhas</span>
                </TabsTrigger>
                <TabsTrigger value="fundosocial" onMouseEnter={() => prefetch('fundosocial')} onFocus={() => prefetch('fundosocial')} className="flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap">
                  <Wallet className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden md:inline">Fundo Social</span>
                </TabsTrigger>
                <TabsTrigger value="financial" onMouseEnter={() => prefetch('financial')} onFocus={() => prefetch('financial')} className="flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap">
                  <DollarSign className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden md:inline">Financeiro</span>
                </TabsTrigger>
                <TabsTrigger value="notifications" onMouseEnter={() => prefetch('notifications')} onFocus={() => prefetch('notifications')} className="flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap">
                  <Bell className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden md:inline">Notificações</span>
                </TabsTrigger>
                <TabsTrigger value="reports" onMouseEnter={() => prefetch('reports')} onFocus={() => prefetch('reports')} className="flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap">
                  <TrendingUp className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden md:inline">Relatórios</span>
                </TabsTrigger>
                <TabsTrigger value="settings" onMouseEnter={() => prefetch('settings')} onFocus={() => prefetch('settings')} className="flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap">
                  <Settings className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden md:inline">Configurações</span>
                </TabsTrigger>
                <TabsTrigger value="marketing" onMouseEnter={() => { prefetch('emailMarketing'); prefetch('emailFunnels'); }} onFocus={() => { prefetch('emailMarketing'); prefetch('emailFunnels'); }} className="flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden md:inline">Marketing</span>
                </TabsTrigger>
                <TabsTrigger value="pix-donations" onMouseEnter={() => prefetch('pixDonations')} onFocus={() => prefetch('pixDonations')} className="flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap">
                  <QrCode className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden md:inline">Doações PIX</span>
                </TabsTrigger>
                <TabsTrigger value="community" onMouseEnter={() => prefetch('community')} onFocus={() => prefetch('community')} className="flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap">
                  <Users className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden md:inline">Comunidade</span>
                </TabsTrigger>
                <TabsTrigger value="banners" onMouseEnter={() => prefetch('banners')} onFocus={() => prefetch('banners')} className="flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap">
                  <Gift className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden md:inline">Banners</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <Suspense fallback={<PanelFallback />}>
            <TabsContent value="dashboard" className="space-y-6">
              <AdminKPIDashboard />
              <Suspense fallback={null}>
                <NotificationDemo />
              </Suspense>
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
              <AdminUserManagement />
            </TabsContent>

            <TabsContent value="businesses" className="space-y-6">
              <AdminBusinessManagement />
            </TabsContent>

            <TabsContent value="offers" className="space-y-6">
              <AdminOfferManagement />
            </TabsContent>

            <TabsContent value="raffles" className="space-y-6">
              <AdminRaffleManagement />
            </TabsContent>

            <TabsContent value="crowdfunding" className="space-y-6">
              <AdminCrowdfundingManagement />
            </TabsContent>

            <TabsContent value="fundosocial" className="space-y-6">
              <AdminFundoSocial />
            </TabsContent>

            <TabsContent value="financial" className="space-y-6">
              <AdminFinancialManagement />
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <AdminNotificationCenter />
            </TabsContent>

            <TabsContent value="reports" className="space-y-6">
              <AdminReports />
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <AdminSettings />
            </TabsContent>

            <TabsContent value="marketing" className="space-y-6">
              <AdminEmailMarketing />
              <AdminEmailFunnels />
            </TabsContent>

            <TabsContent value="pix-donations" className="space-y-6">
              <AdminPixDonations />
            </TabsContent>

            <TabsContent value="community" className="space-y-6">
              <AdminCommunityHighlights />
            </TabsContent>

            <TabsContent value="banners" className="space-y-6">
              <AdminSponsoredBanners />
            </TabsContent>
          </Suspense>

        </Tabs>
      </div>
    </div>
  );
};