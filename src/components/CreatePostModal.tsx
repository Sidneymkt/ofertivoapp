import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Plus, AtSign, ChevronDown, ChevronUp } from 'lucide-react';
import { CommunityImageUpload } from './CommunityImageUpload';
import { PostMentionSelector, Mention } from './PostMentionSelector';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

interface CreatePostModalProps {
  onCreatePost: (content: string, imageUrl?: string, postType?: 'standard' | 'promotion' | 'announcement', mentions?: Mention[]) => Promise<boolean>;
}

export const CreatePostModal = ({ onCreatePost }: CreatePostModalProps) => {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [loading, setLoading] = useState(false);
  const [showMentions, setShowMentions] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setLoading(true);
    const success = await onCreatePost(content, imageUrl || undefined, 'standard', mentions.length > 0 ? mentions : undefined);
    setLoading(false);

    if (success) {
      setContent('');
      setImageUrl('');
      setMentions([]);
      setShowMentions(false);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Nova Publicação
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Criar Publicação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="content">O que você quer compartilhar?</Label>
            <Textarea
              id="content"
              placeholder="Compartilhe novidades, promoções ou ideias com a comunidade..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] mt-2"
            />
          </div>

          <div>
            <Label>Imagem (opcional)</Label>
            <div className="mt-2">
              <CommunityImageUpload
                onImageUploaded={setImageUrl}
                currentImageUrl={imageUrl}
              />
            </div>
          </div>

          {/* Seção de menções */}
          <Collapsible open={showMentions} onOpenChange={setShowMentions}>
            <CollapsibleTrigger asChild>
              <Button 
                type="button" 
                variant="outline" 
                className="w-full justify-between"
              >
                <span className="flex items-center gap-2">
                  <AtSign className="h-4 w-4" />
                  Marcar ofertas, usuários, negócios...
                  {mentions.length > 0 && (
                    <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                      {mentions.length}
                    </span>
                  )}
                </span>
                {showMentions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <PostMentionSelector 
                mentions={mentions}
                onMentionsChange={setMentions}
              />
            </CollapsibleContent>
          </Collapsible>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!content.trim() || loading}
            >
              {loading ? 'Publicando...' : 'Publicar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
