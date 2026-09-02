import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Star, MessageSquare, Trash2 } from 'lucide-react';
import { useBusinessReviews } from '@/hooks/useBusinessReviews';
import { useAuth } from '@/hooks/useAuth';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BusinessReviewsSectionProps {
  businessId: string;
}

export const BusinessReviewsSection: React.FC<BusinessReviewsSectionProps> = ({
  businessId
}) => {
  const { user } = useAuth();
  const {
    reviews,
    userReview,
    loading,
    submitting,
    submitReview,
    deleteReview,
    getAverageRating,
    getRatingDistribution
  } = useBusinessReviews(businessId);

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');

  const handleSubmitReview = async () => {
    const success = await submitReview({
      rating: newRating,
      comment: newComment.trim() || undefined
    });

    if (success) {
      setShowReviewForm(false);
      setNewComment('');
      setNewRating(5);
    }
  };

  const handleDeleteReview = async () => {
    await deleteReview();
  };

  const renderStars = (rating: number, interactive = false, onStarClick?: (rating: number) => void) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${
              star <= rating 
                ? 'fill-yellow-400 text-yellow-400' 
                : 'text-gray-300'
            } ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
            onClick={interactive && onStarClick ? () => onStarClick(star) : undefined}
          />
        ))}
      </div>
    );
  };

  const averageRating = getAverageRating();
  const distribution = getRatingDistribution();
  const totalReviews = reviews.length;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          Avaliações dos Clientes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rating Summary */}
        {totalReviews > 0 && (
          <div className="flex items-center gap-6 pb-4 border-b">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">{averageRating}</div>
              <div className="flex items-center justify-center">
                {renderStars(Math.round(averageRating))}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {totalReviews} {totalReviews === 1 ? 'avaliação' : 'avaliações'}
              </div>
            </div>

            {/* Rating Distribution */}
            <div className="flex-1 space-y-2">
              {[5, 4, 3, 2, 1].map((stars) => (
                <div key={stars} className="flex items-center gap-2">
                  <span className="text-sm w-4">{stars}</span>
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <Progress 
                    value={totalReviews > 0 ? (distribution[stars as keyof typeof distribution] / totalReviews) * 100 : 0} 
                    className="flex-1 h-2" 
                  />
                  <span className="text-sm text-muted-foreground w-8">
                    {distribution[stars as keyof typeof distribution]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Review Form */}
        {user && (
          <div className="space-y-4">
            {userReview ? (
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Sua avaliação:</span>
                    {renderStars(userReview.rating)}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowReviewForm(true);
                        setNewRating(userReview.rating);
                        setNewComment(userReview.comment || '');
                      }}
                    >
                      Editar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover avaliação</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja remover sua avaliação? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteReview}>
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                {userReview.comment && (
                  <p className="text-sm text-muted-foreground mt-2">
                    "{userReview.comment}"
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <Button onClick={() => setShowReviewForm(true)}>
                  Deixe sua avaliação
                </Button>
              </div>
            )}

            {showReviewForm && (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium">Sua avaliação:</label>
                    <div className="mt-2">
                      {renderStars(newRating, true, setNewRating)}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Seu comentário (opcional):</label>
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Conte sobre sua experiência..."
                      className="mt-2"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSubmitReview} 
                      disabled={submitting}
                      className="flex-1"
                    >
                      {submitting ? 'Enviando...' : userReview ? 'Atualizar avaliação' : 'Enviar avaliação'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowReviewForm(false);
                        setNewComment('');
                        setNewRating(5);
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Reviews List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-pulse">Carregando avaliações...</div>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma avaliação ainda</p>
              <p className="text-sm">Seja o primeiro a avaliar este negócio!</p>
            </div>
          ) : (
            reviews
              .filter(review => review.user_id !== user?.id) // Don't show user's own review in the list
              .map((review) => (
                <Card key={review.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={review.profiles?.avatar_url} />
                      <AvatarFallback>
                        {review.profiles?.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {review.profiles?.full_name || 'Usuário anônimo'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {renderStars(review.rating)}
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(review.created_at), {
                                addSuffix: true,
                                locale: ptBR
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {review.comment && (
                        <p className="text-sm text-muted-foreground">
                          "{review.comment}"
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};