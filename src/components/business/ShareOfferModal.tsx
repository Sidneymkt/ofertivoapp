import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Loader2, 
  Share2, 
  Copy, 
  Facebook,
  Instagram,
  Clock,
  TrendingUp,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { getAppBaseUrl } from '@/lib/config';
import { getEdgeFunctionError, isAiQuotaError } from '@/lib/edgeError';
import { buildLocalSocialContent } from '@/lib/offerCopyFallback';

interface ShareOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: {
    id: string;
    title: string;
    description: string;
    category: string;
    original_price: number;
    discounted_price: number;
    image_url?: string;
  };
  businessName: string;
}

export const ShareOfferModal = ({ 
  isOpen, 
  onClose, 
  offer, 
  businessName 
}: ShareOfferModalProps) => {
  const [loading, setLoading] = useState(false);
  const [socialContent, setSocialContent] = useState<{
    short: string;
    emoji: string;
    formal: string;
    hashtags: string[];
    bestTime: string;
    audienceTip: string;
  } | null>(null);

  const generateContent = async () => {
    setLoading(true);
    try {
      const discount = Math.round(((offer.original_price - offer.discounted_price) / offer.original_price) * 100);
      const offerUrl = `${getAppBaseUrl()}/ofertas/${offer.id}`;
      
      const prompt = `
Crie conteúdo otimizado para redes sociais desta oferta:

OFERTA:
- Título: ${offer.title}
- Descrição: ${offer.description}
- Negócio: ${businessName}
- Categoria: ${offer.category}
- Desconto: ${discount}%
- Preços: De R$ ${offer.original_price.toFixed(2)} por R$ ${offer.discounted_price.toFixed(2)}
- Link: ${offerUrl}

GERE:
1. Texto curto para Stories/WhatsApp (max 140 chars, com emojis)
2. Texto com emojis para feed (max 200 chars)
3. Texto formal para anúncios (max 180 chars)
4. 5 hashtags relevantes
5. Melhor horário para postar
6. Dica de público-alvo

Retorne em formato JSON:
{
  "short": "string",
  "emoji": "string", 
  "formal": "string",
  "hashtags": ["string"],
  "bestTime": "18:00",
  "audienceTip": "string"
}
`;

      const { data, error } = await supabase.functions.invoke('marketing-ai', {
        body: { prompt, action: 'generate_social' }
      });

      if (error) throw error;

      if (data.content) {
        setSocialContent(data.content);
      }
    } catch (error) {
      console.error('Erro ao gerar conteúdo:', error);
      const { status, message } = await getEdgeFunctionError(error);
      // Fallback local: a divulgação continua funcionando mesmo sem IA.
      setSocialContent(buildLocalSocialContent({
        title: offer.title,
        description: offer.description,
        category: offer.category,
        businessName,
        originalPrice: offer.original_price,
        discountedPrice: offer.discounted_price,
      }));
      if (isAiQuotaError(status, message)) {
        toast.info('IA indisponível no momento (créditos/limite). Geramos os textos automaticamente sem IA.');
      } else {
        toast.warning(`IA indisponível: ${message}. Textos gerados sem IA.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Texto copiado!');
  };

  const shareWhatsApp = (text: string) => {
    const offerUrl = `${getAppBaseUrl()}/ofertas/${offer.id}`;
    const fullText = `${text}\n\n🔗 ${offerUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(fullText)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareFacebook = () => {
    const offerUrl = `${getAppBaseUrl()}/ofertas/${offer.id}`;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(offerUrl)}`;
    window.open(facebookUrl, '_blank');
  };

  const shareInstagram = (text: string) => {
    copyToClipboard(text);
    toast.success('Texto copiado! Cole no Instagram');
  };

  React.useEffect(() => {
    if (isOpen && !socialContent) {
      generateContent();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Divulgar com IA
          </DialogTitle>
          <DialogDescription>
            Conteúdo otimizado para redes sociais gerado automaticamente
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Gerando conteúdo otimizado...</p>
          </div>
        ) : socialContent ? (
          <div className="space-y-4">
            {/* Preview da Imagem */}
            {offer.image_url && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Imagem da Oferta</label>
                <img 
                  src={offer.image_url} 
                  alt={offer.title}
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
            )}

            {/* Tabs de Conteúdo */}
            <Tabs defaultValue="short" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="short">Stories/WhatsApp</TabsTrigger>
                <TabsTrigger value="emoji">Feed com Emojis</TabsTrigger>
                <TabsTrigger value="formal">Formal</TabsTrigger>
              </TabsList>

              <TabsContent value="short" className="space-y-2">
                <Textarea 
                  value={socialContent.short}
                  onChange={(e) => setSocialContent({ ...socialContent, short: e.target.value })}
                  rows={4}
                  className="resize-none"
                />
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(socialContent.short)}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => shareWhatsApp(socialContent.short)}
                    className="bg-[#25D366] text-white hover:bg-[#20BA5A]"
                  >
                    WhatsApp
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="emoji" className="space-y-2">
                <Textarea 
                  value={socialContent.emoji}
                  onChange={(e) => setSocialContent({ ...socialContent, emoji: e.target.value })}
                  rows={4}
                  className="resize-none"
                />
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(socialContent.emoji)}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => shareInstagram(socialContent.emoji)}
                    className="bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white"
                  >
                    <Instagram className="w-4 h-4 mr-2" />
                    Instagram
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={shareFacebook}
                    className="bg-[#1877F2] text-white hover:bg-[#166FE5]"
                  >
                    <Facebook className="w-4 h-4 mr-2" />
                    Facebook
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="formal" className="space-y-2">
                <Textarea 
                  value={socialContent.formal}
                  onChange={(e) => setSocialContent({ ...socialContent, formal: e.target.value })}
                  rows={4}
                  className="resize-none"
                />
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(socialContent.formal)}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar
                </Button>
              </TabsContent>
            </Tabs>

            {/* Hashtags */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Hashtags</label>
              <div className="flex flex-wrap gap-2">
                {socialContent.hashtags.map((tag, idx) => (
                  <Badge 
                    key={idx} 
                    variant="outline"
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => copyToClipboard(socialContent.hashtags.join(' '))}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Sugestões Inteligentes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <p className="font-medium text-sm">Melhor Horário</p>
                    <p className="text-2xl font-bold text-primary">
                      {socialContent.bestTime}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Horário de pico na sua cidade
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <p className="font-medium text-sm">Público-Alvo</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {socialContent.audienceTip}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Link da Oferta */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Link da Oferta no Ofertivo</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={`${getAppBaseUrl()}/ofertas/${offer.id}`}
                  readOnly
                  className="flex-1 px-3 py-2 bg-muted rounded-md text-sm"
                />
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(`${getAppBaseUrl()}/ofertas/${offer.id}`)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Botão Gerar Novamente */}
            <Button 
              variant="outline"
              onClick={generateContent}
              disabled={loading}
              className="w-full"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Gerar Novo Conteúdo
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
