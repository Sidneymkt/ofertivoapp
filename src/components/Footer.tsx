import { Link } from 'react-router-dom';
import { Heart, Mail, MapPin, Phone } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export const Footer = () => {
  return (
    <footer className="bg-card border-t mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Sobre o Ofertivo */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-primary">Ofertivo</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Conectando negócios locais e consumidores através de ofertas inteligentes e gamificação.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>Sua cidade</span>
            </div>
          </div>

          {/* Links Rápidos */}
          <div>
            <h3 className="font-bold text-lg mb-4">Links Rápidos</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/ofertas" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Ofertas
                </Link>
              </li>
              <li>
                <Link to="/mapa" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Mapa
                </Link>
              </li>
              <li>
                <Link to="/sorteios" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Sorteios
                </Link>
              </li>
            </ul>
          </div>

          {/* Para Anunciantes */}
          <div>
            <h3 className="font-bold text-lg mb-4">Para Anunciantes</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/anuncie" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Anuncie no Ofertivo
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/anunciante/planos" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Planos
                </Link>
              </li>
              <li>
                <Link to="/anunciante/suporte" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Suporte
                </Link>
              </li>
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h3 className="font-bold text-lg mb-4">Contato</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>contato@ofertivo.com.br</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>(92) 9 9999-9999</span>
              </li>
              <li>
                <Link to="/suporte" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Central de Ajuda
                </Link>
              </li>
              <li>
                <Link to="/termos" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Termos de Uso
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-6" />

        {/* App Store Badges */}
        <div className="flex flex-wrap gap-3 justify-center mb-6">
          <a href="#" aria-label="Baixar na App Store" className="hover:opacity-80 transition-opacity bg-black rounded-lg px-1 py-0.5">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Download_on_the_App_Store_Badge.svg/1280px-Download_on_the_App_Store_Badge.svg.png" alt="Disponível na App Store" className="h-10 w-auto" loading="lazy" />
          </a>
          <a href="#" aria-label="Baixar na Google Play" className="hover:opacity-80 transition-opacity bg-black rounded-lg px-1 py-0.5">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Google_Play_Store_badge_EN.svg/1024px-Google_Play_Store_badge_EN.svg.png" alt="Disponível na Google Play" className="h-10 w-auto" loading="lazy" />
          </a>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Ofertivo. Todos os direitos reservados.</p>
          <p className="flex items-center gap-1">
            Feito com <Heart className="h-4 w-4 text-red-500 fill-red-500" /> na sua cidade
          </p>
        </div>
      </div>
    </footer>
  );
};
