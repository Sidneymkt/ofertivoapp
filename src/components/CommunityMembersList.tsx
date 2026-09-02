import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { MessageCircle, Heart, MapPin, TrendingUp, Send, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserNavigation } from '@/hooks/useUserNavigation';
import { SendPointsModal } from './SendPointsModal';
import { useAuth } from '@/hooks/useAuth';
import { ChatWindow } from './ChatWindow';

interface CommunityMember {
  user_id: string;
  full_name: string;
  avatar_url: string;
  city: string;
  total_points: number;
  user_type: string;
  followers_count: number;
}

export const CommunityMembersList = () => {
  const { userProfile } = useAuth();
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<CommunityMember | null>(null);
  const [chatMember, setChatMember] = useState<CommunityMember | null>(null);
  const { navigateToUserProfile, navigateToBusinessProfile } = useUserNavigation();

  const loadMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, city, total_points, user_type, followers_count')
        .order('total_points', { ascending: false })
        .limit(20);

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleProfileClick = (member: CommunityMember) => {
    if (member.user_type === 'business') {
      // Buscar business_id
      supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', member.user_id)
        .single()
        .then(({ data }) => {
          if (data) {
            navigateToBusinessProfile(data.id);
          }
        });
    } else {
      navigateToUserProfile(member.user_id);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Membros da Comunidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar membro por nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando membros...</p>
          ) : (
            <div className="space-y-3">
              {members
                .filter((m) => m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleProfileClick(member)}
                >
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                      <AvatarImage src={member.avatar_url} />
                      <AvatarFallback>
                        {member.full_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <p className="font-semibold truncate text-sm sm:text-base">{member.full_name}</p>
                        {member.user_type === 'business' && (
                          <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                            Anunciante
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span className="hidden sm:inline">{member.city || 'Sua cidade'}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {member.followers_count || 0}
                        </span>
                        <div className="flex flex-col gap-0.5">
                          <Badge variant="outline" className="text-xs">
                            {member.total_points || 0} pts
                          </Badge>
                          <span className="text-[10px] text-muted-foreground text-center">
                            R$ {((member.total_points || 0) / 100).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 sm:h-9 sm:w-9"
                      onClick={(e) => {
                        e.stopPropagation();
                        setChatMember(member);
                      }}
                      title="Conversar"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 sm:h-auto sm:w-auto sm:px-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMember(member);
                      }}
                      title="Doar Pontos"
                    >
                      <Send className="h-4 w-4 sm:hidden" />
                      <span className="hidden sm:inline">Doar Pontos</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedMember && (
        <SendPointsModal
          open={!!selectedMember}
          onOpenChange={(open) => !open && setSelectedMember(null)}
          receiverId={selectedMember.user_id}
          receiverName={selectedMember.full_name}
          userPoints={userProfile?.total_points || 0}
        />
      )}

      {chatMember && (
        <ChatWindow
          targetUserId={chatMember.user_id}
          businessName={chatMember.full_name}
          onClose={() => setChatMember(null)}
        />
      )}
    </>
  );
};
