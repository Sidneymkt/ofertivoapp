import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Users, UserPlus, UserCheck, UserX,
  GripVertical, MessageCircle,
  TrendingUp, Crown, AlertTriangle, RefreshCw,
  Lock, Zap, BarChart3, Bell, Star, ArrowRight,
  Pencil, Trash2, Tag, X, Plus, Save, Search, SlidersHorizontal, MoreVertical,
} from 'lucide-react';
import { CRMKanbanLead, LeadStatus, KanbanStats } from '@/hooks/useCRMKanban';
import { useUserNavigation } from '@/hooks/useUserNavigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { LeadHistoryTimeline } from '@/components/LeadHistoryTimeline';
import { Phone, Clock as ClockIcon } from 'lucide-react';
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, KeyboardSensor,
  useSensor, useSensors, closestCorners, useDroppable, pointerWithin,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface KanbanColumnConfig {
  status: LeadStatus;
  title: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const COLUMNS: KanbanColumnConfig[] = [
  { status: 'novo', title: 'Novo Lead', icon: <UserPlus className="w-4 h-4" />, color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/30' },
  { status: 'interessado', title: 'Interessado', icon: <Star className="w-4 h-4" />, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10 border-yellow-500/30' },
  { status: 'cliente', title: 'Cliente', icon: <UserCheck className="w-4 h-4" />, color: 'text-green-400', bgColor: 'bg-green-500/10 border-green-500/30' },
  { status: 'perdido', title: 'Perdido', icon: <UserX className="w-4 h-4" />, color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/30' },
];

const TAG_COLORS = [
  'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'bg-green-500/20 text-green-300 border-green-500/30',
  'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'bg-orange-500/20 text-orange-300 border-orange-500/30',
  'bg-pink-500/20 text-pink-300 border-pink-500/30',
  'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
];

function getTagColor(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

interface CRMKanbanBoardProps {
  leads: CRMKanbanLead[];
  stats: KanbanStats;
  isPro: boolean;
  isAtLimit: boolean;
  freeLimit: number;
  alertas: any[];
  getLeadsByStatus: (status: LeadStatus) => CRMKanbanLead[];
  updateLeadStatus: (leadId: string, status: LeadStatus) => Promise<void>;
  updateLeadDetails: (leadId: string, data: { observacoes?: string; etiquetas?: string[] }) => Promise<void>;
  deleteLead: (leadId: string) => Promise<void>;
  syncLeads: () => Promise<void>;
  dismissAlerta: (id: string) => Promise<void>;
}

const LeadCard = ({ lead, onStatusChange, onUpdateDetails, onDelete, isPro, isOverlay = false }: {
  lead: CRMKanbanLead;
  onStatusChange: (leadId: string, status: LeadStatus) => void;
  onUpdateDetails: (leadId: string, data: { observacoes?: string; etiquetas?: string[] }) => Promise<void>;
  onDelete: (leadId: string) => Promise<void>;
  isPro: boolean;
  isOverlay?: boolean;
}) => {
  const [showDetail, setShowDetail] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editObservacoes, setEditObservacoes] = useState(lead.observacoes || '');
  const [editEtiquetas, setEditEtiquetas] = useState<string[]>(lead.etiquetas || []);
  const [newTag, setNewTag] = useState('');
  const { navigateToUserProfile } = useUserNavigation();

  const sortable = useSortable({ id: lead.id, data: { status: lead.status } });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;
  const style: React.CSSProperties = isOverlay
    ? {}
    : {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      };

  const getOrigemLabel = (origem: string) => {
    const map: Record<string, string> = {
      checkin: 'Check-in', favorito: 'Favorito', follow: 'Seguiu',
      sorteio: 'Sorteio', mensagem: 'Mensagem', comentario: 'Comentário',
    };
    return map[origem] || origem;
  };

  const getWhatsAppMessage = (name: string, status: LeadStatus, origem: string) => {
    const firstName = name.split(' ')[0];
    
    const messagesByStatus: Record<LeadStatus, string> = {
      novo: `Olá ${firstName}! 👋 Vi que você conheceu nosso negócio pelo Ofertivo. Temos ofertas exclusivas esperando por você! Quer saber mais? 🎯`,
      interessado: `Olá ${firstName}! 😊 Que bom que você demonstrou interesse! Preparamos condições especiais para você aproveitar. Posso te contar mais? 🔥`,
      cliente: `Olá ${firstName}! 🌟 Obrigado por ser nosso cliente! Temos novidades e ofertas exclusivas para clientes fiéis como você. Confira! 🎁`,
      perdido: `Olá ${firstName}! 👋 Sentimos sua falta! Preparamos algo especial para você voltar. Que tal dar uma olhada nas nossas novidades? 💫`,
    };

    return messagesByStatus[status] || messagesByStatus.novo;
  };

  const sendWhatsApp = (phone: string, name: string) => {
    const msg = getWhatsAppMessage(name, lead.status, lead.origem);
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleSave = async () => {
    await onUpdateDetails(lead.id, { observacoes: editObservacoes, etiquetas: editEtiquetas });
    setIsEditing(false);
  };

  const handleAddTag = () => {
    const tag = newTag.trim();
    if (tag && !editEtiquetas.includes(tag)) {
      setEditEtiquetas([...editEtiquetas, tag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setEditEtiquetas(editEtiquetas.filter(t => t !== tag));
  };

  const handleDelete = async () => {
    await onDelete(lead.id);
    setShowDeleteConfirm(false);
    setShowDetail(false);
  };

  const openEdit = () => {
    setEditObservacoes(lead.observacoes || '');
    setEditEtiquetas(lead.etiquetas || []);
    setIsEditing(true);
  };

  return (
    <>
      <div
        ref={isOverlay ? undefined : setNodeRef}
        style={style}
        className={`relative bg-card/95 backdrop-blur-sm border rounded-lg p-3 transition-shadow duration-200 group ${
          isOverlay
            ? 'border-primary shadow-2xl ring-2 ring-primary/40 rotate-2 cursor-grabbing'
            : 'border-border/50 hover:border-primary/50 hover:shadow-md'
        }`}
        onClick={() => { if (!isOverlay && !isDragging) setShowDetail(true); }}
      >
        <div className="flex items-start gap-2">
          <button
            {...(isOverlay ? {} : attributes)}
            {...(isOverlay ? {} : listeners)}
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0 mt-1 p-1 -m-1 rounded hover:bg-muted/60 text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
            aria-label="Arrastar lead"
            title="Arrastar para mover"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <Avatar className="w-9 h-9 flex-shrink-0">
            <AvatarImage src={lead.avatar_url} />
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
              {lead.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate pr-6">{lead.name}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {getOrigemLabel(lead.origem)}
              </Badge>
              {lead.recorrente && isPro && (
                <Badge className="text-[10px] px-1.5 py-0 bg-green-500/20 text-green-400 border-green-500/30">
                  Recorrente
                </Badge>
              )}
              {lead.inativo && isPro && (
                <Badge className="text-[10px] px-1.5 py-0 bg-red-500/20 text-red-400 border-red-500/30">
                  Inativo
                </Badge>
              )}
            </div>
            {lead.etiquetas && lead.etiquetas.length > 0 && (
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                {lead.etiquetas.slice(0, 3).map(tag => (
                  <span key={tag} className={`text-[9px] px-1.5 py-0 rounded-full border ${getTagColor(tag)}`}>
                    {tag}
                  </span>
                ))}
                {lead.etiquetas.length > 3 && (
                  <span className="text-[9px] text-muted-foreground">+{lead.etiquetas.length - 3}</span>
                )}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">
              {new Date(lead.ultima_interacao).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>

        {/* Quick actions row */}
        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-border/30">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            {isPro && lead.score_engajamento > 0 && (
              <span className="inline-flex items-center gap-1">
                <Zap className="w-3 h-3 text-yellow-400" /> {lead.score_engajamento}
              </span>
            )}
            {lead.total_interactions > 0 && (
              <span className="inline-flex items-center gap-1 ml-2">
                <UserCheck className="w-3 h-3" /> {lead.total_interactions}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {lead.phone && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-green-500 hover:bg-green-500/10"
                onClick={() => sendWhatsApp(lead.phone!, lead.name)}
                title="WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7" title="Ações">
                  <MoreVertical className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs">Mover para</DropdownMenuLabel>
                {COLUMNS.filter(c => c.status !== lead.status).map(col => (
                  <DropdownMenuItem
                    key={col.status}
                    onClick={() => onStatusChange(lead.id, col.status)}
                    className="gap-2 text-xs"
                  >
                    <span className={col.color}>{col.icon}</span> {col.title}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowDetail(true)} className="gap-2 text-xs">
                  <Pencil className="w-3.5 h-3.5" /> Editar detalhes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="gap-2 text-xs text-destructive focus:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" /> Excluir lead
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Lead Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={(open) => { setShowDetail(open); if (!open) setIsEditing(false); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={lead.avatar_url} />
                <AvatarFallback className="bg-primary/20 text-primary font-bold">
                  {lead.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p>{lead.name}</p>
                <p className="text-sm font-normal text-muted-foreground">
                  {getOrigemLabel(lead.origem)} • {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{lead.total_interactions}</p>
                <p className="text-xs text-muted-foreground">Interações</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{lead.total_points}</p>
                <p className="text-xs text-muted-foreground">Pontos</p>
              </div>
            </div>

            {/* Contato */}
            {(lead.phone) && (
              <div className="flex items-center gap-2 text-xs bg-muted/30 rounded-lg px-3 py-2">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-medium flex-1">{lead.phone}</span>
                <Button
                  size="sm"
                  className="h-7 gap-1.5 bg-[#25D366] hover:bg-[#20BA5A] text-white"
                  onClick={() => sendWhatsApp(lead.phone!, lead.name)}
                >
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </Button>
              </div>
            )}

            {/* Histórico */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ClockIcon className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-medium">Histórico de interações</p>
              </div>
              <LeadHistoryTimeline businessId={lead.business_id} userId={lead.user_id} />
            </div>


            {/* Etiquetas */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-medium">Etiquetas</p>
              </div>
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {editEtiquetas.map(tag => (
                      <span key={tag} className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${getTagColor(tag)}`}>
                        {tag}
                        <button onClick={() => handleRemoveTag(tag)} className="hover:opacity-70">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Nova etiqueta..."
                      className="h-8 text-sm"
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                    />
                    <Button size="sm" variant="outline" className="h-8 px-2" onClick={handleAddTag}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {(lead.etiquetas && lead.etiquetas.length > 0) ? lead.etiquetas.map(tag => (
                    <span key={tag} className={`text-xs px-2 py-0.5 rounded-full border ${getTagColor(tag)}`}>
                      {tag}
                    </span>
                  )) : (
                    <p className="text-xs text-muted-foreground italic">Nenhuma etiqueta</p>
                  )}
                </div>
              )}
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <p className="text-sm font-medium">📝 Observações</p>
              {isEditing ? (
                <Textarea
                  value={editObservacoes}
                  onChange={(e) => setEditObservacoes(e.target.value)}
                  placeholder="Adicione observações sobre este lead..."
                  className="min-h-[80px] text-sm"
                />
              ) : (
                <div className="bg-muted/30 rounded-lg p-3 min-h-[40px]">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {lead.observacoes || <span className="italic">Nenhuma observação</span>}
                  </p>
                </div>
              )}
            </div>

            {/* Edit/Save Button */}
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button size="sm" className="gap-2 flex-1" onClick={handleSave}>
                    <Save className="w-4 h-4" /> Salvar
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => setIsEditing(false)}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" className="gap-2 flex-1" onClick={openEdit}>
                  <Pencil className="w-4 h-4" /> Editar
                </Button>
              )}
            </div>

            {/* Status Buttons */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Mover para:</p>
              <div className="grid grid-cols-2 gap-2">
                {COLUMNS.filter(c => c.status !== lead.status).map(col => (
                  <Button
                    key={col.status}
                    variant="outline"
                    size="sm"
                    className="gap-2 justify-start"
                    onClick={() => { onStatusChange(lead.id, col.status); setShowDetail(false); }}
                  >
                    {col.icon} {col.title}
                  </Button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {lead.phone && (
                <Button size="sm" className="gap-2 flex-1" onClick={() => sendWhatsApp(lead.phone!, lead.name)}>
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </Button>
              )}
              <Button size="sm" variant="outline" className="gap-2 flex-1" onClick={() => navigateToUserProfile(lead.user_id)}>
                <Users className="w-4 h-4" /> Ver Perfil
              </Button>
            </div>

            {/* Delete */}
            <Button
              size="sm"
              variant="destructive"
              className="w-full gap-2"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-4 h-4" /> Excluir Lead
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lead?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o lead "{lead.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const KanbanColumn = ({ config, leads, onStatusChange, onUpdateDetails, onDelete, isPro, activeStatus }: {
  config: KanbanColumnConfig;
  leads: CRMKanbanLead[];
  onStatusChange: (leadId: string, status: LeadStatus) => void;
  onUpdateDetails: (leadId: string, data: { observacoes?: string; etiquetas?: string[] }) => Promise<void>;
  onDelete: (leadId: string) => Promise<void>;
  isPro: boolean;
  activeStatus: LeadStatus | null;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${config.status}`, data: { status: config.status } });
  const isTarget = isOver || (activeStatus !== null && activeStatus !== config.status && isOver);
  const canReceive = activeStatus !== null && activeStatus !== config.status;

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl border ${config.bgColor} min-h-[400px] transition-all duration-200 ${
        isOver ? 'ring-2 ring-primary/70 scale-[1.01] shadow-lg' : canReceive ? 'ring-1 ring-primary/20 ring-dashed' : ''
      }`}
    >
      <div className="flex items-center justify-between p-3 border-b border-border/30">
        <div className="flex items-center gap-2 min-w-0">
          <span className={config.color}>{config.icon}</span>
          <h3 className="font-semibold text-sm truncate">{config.title}</h3>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isPro && leads.length > 0 && (
            <span className="text-[10px] text-muted-foreground" title="Total de interações na coluna">
              {leads.reduce((s, l) => s + (l.total_interactions || 0), 0)} int.
            </span>
          )}
          <Badge variant="secondary" className="text-xs px-2 py-0.5">
            {leads.length}
          </Badge>
        </div>
      </div>

      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[60vh]">
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.length === 0 ? (
            <div className={`flex flex-col items-center justify-center h-32 rounded-lg border-2 border-dashed transition-colors ${
              isOver ? 'border-primary/60 bg-primary/5 text-primary' : 'border-transparent text-muted-foreground/50'
            }`}>
              <Users className="w-8 h-8 mb-2" />
              <p className="text-xs">{isOver ? 'Solte aqui' : 'Arraste leads aqui'}</p>
            </div>
          ) : (
            leads.map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onStatusChange={onStatusChange}
                onUpdateDetails={onUpdateDetails}
                onDelete={onDelete}
                isPro={isPro}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
};

export const CRMKanbanBoard: React.FC<CRMKanbanBoardProps> = ({
  leads, stats, isPro, isAtLimit, freeLimit, alertas,
  getLeadsByStatus, updateLeadStatus, updateLeadDetails, deleteLead, syncLeads, dismissAlerta,
}) => {
  const [activeLead, setActiveLead] = useState<CRMKanbanLead | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [origemFilter, setOrigemFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'score' | 'interactions'>('recent');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    leads.forEach(l => (l.etiquetas || []).forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [leads]);

  const filterAndSort = (list: CRMKanbanLead[]) => {
    const term = search.trim().toLowerCase();
    let out = list.filter(l => {
      if (term) {
        const hay = `${l.name} ${l.phone || ''} ${(l.etiquetas || []).join(' ')} ${l.observacoes || ''}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (origemFilter !== 'all' && l.origem !== origemFilter) return false;
      if (tagFilter !== 'all' && !(l.etiquetas || []).includes(tagFilter)) return false;
      return true;
    });
    out = [...out].sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'score': return (b.score_engajamento || 0) - (a.score_engajamento || 0);
        case 'interactions': return (b.total_interactions || 0) - (a.total_interactions || 0);
        default: return new Date(b.ultima_interacao).getTime() - new Date(a.ultima_interacao).getTime();
      }
    });
    return out;
  };

  const getFilteredByStatus = (status: LeadStatus) => filterAndSort(getLeadsByStatus(status));
  const filteredTotal = COLUMNS.reduce((s, c) => s + getFilteredByStatus(c.status).length, 0);
  const activeFilters = (search ? 1 : 0) + (origemFilter !== 'all' ? 1 : 0) + (tagFilter !== 'all' ? 1 : 0);

  const handleDndStart = (e: DragStartEvent) => {
    const lead = leads.find(l => l.id === e.active.id);
    setActiveLead(lead || null);
  };

  const handleDndEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveLead(null);
    if (!over) return;

    const draggedLead = leads.find(l => l.id === active.id);
    if (!draggedLead) return;

    // Over can be a column droppable (col-<status>) or another lead
    let targetStatus: LeadStatus | null = null;
    const overData = over.data.current as { status?: LeadStatus } | undefined;
    if (overData?.status) targetStatus = overData.status;
    if (!targetStatus && typeof over.id === 'string' && over.id.startsWith('col-')) {
      targetStatus = over.id.replace('col-', '') as LeadStatus;
    }

    if (targetStatus && targetStatus !== draggedLead.status) {
      await updateLeadStatus(draggedLead.id, targetStatus);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    await syncLeads();
    setSyncing(false);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {COLUMNS.map(col => (
          <Card key={col.status} className={`border ${col.bgColor}`}>
            <CardContent className="p-4 text-center">
              <div className={`${col.color} flex justify-center mb-2`}>{col.icon}</div>
              <p className="text-2xl font-bold">{getLeadsByStatus(col.status).length}</p>
              <p className="text-xs text-muted-foreground">{col.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Limit Warning */}
      {isAtLimit && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-sm">Limite de {freeLimit} leads atingido</p>
              <p className="text-xs text-muted-foreground">Faça upgrade para o plano Pro para leads ilimitados.</p>
            </div>
            <Button size="sm" className="gap-1 flex-shrink-0">
              <Crown className="w-4 h-4" /> Upgrade
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pro Alerts */}
      {isPro && alertas.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-4 h-4 text-primary" />
              <p className="font-semibold text-sm">Alertas Inteligentes</p>
              <Badge variant="secondary" className="text-xs">{alertas.length}</Badge>
            </div>
            {alertas.slice(0, 3).map(alerta => (
              <div key={alerta.id} className="flex items-center justify-between bg-card/50 rounded-lg p-2">
                <p className="text-xs">{
                  alerta.tipo_alerta === 'lead_inativo' ? '⏰ Lead inativo há mais de 30 dias' :
                  alerta.tipo_alerta === 'interessado_sem_acao' ? '💡 Lead interessado sem ação há 3 dias' :
                  alerta.tipo_alerta === 'cliente_recorrente' ? '🌟 Novo cliente recorrente!' :
                  alerta.tipo_alerta === 'novo_lead' ? '🆕 Novo lead adicionado' :
                  '🔄 Oportunidade de reengajamento'
                }</p>
                <Button size="sm" variant="ghost" className="text-xs h-6 px-2" onClick={() => dismissAlerta(alerta.id)}>
                  OK
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Toolbar: sync + filters + search */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-sm text-muted-foreground">
            {activeFilters > 0 ? `${filteredTotal} de ${leads.length}` : `${leads.length}`} leads {!isPro && `/ ${freeLimit} máx`}
          </p>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            Sincronizar Leads
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, telefone, etiqueta ou observação..."
              className="pl-8 h-9 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Limpar busca"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={origemFilter} onValueChange={setOrigemFilter}>
              <SelectTrigger className="h-9 text-xs w-[140px]">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas origens</SelectItem>
                <SelectItem value="checkin">Check-in</SelectItem>
                <SelectItem value="favorito">Favorito</SelectItem>
                <SelectItem value="follow">Seguiu</SelectItem>
                <SelectItem value="sorteio">Sorteio</SelectItem>
                <SelectItem value="mensagem">Mensagem</SelectItem>
                <SelectItem value="comentario">Comentário</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tagFilter} onValueChange={setTagFilter} disabled={allTags.length === 0}>
              <SelectTrigger className="h-9 text-xs w-[140px]">
                <SelectValue placeholder="Etiqueta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas etiquetas</SelectItem>
                {allTags.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="h-9 text-xs w-[160px]">
                <SlidersHorizontal className="w-3.5 h-3.5 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mais recentes</SelectItem>
                <SelectItem value="name">Nome (A-Z)</SelectItem>
                <SelectItem value="score">Maior score</SelectItem>
                <SelectItem value="interactions">Mais interações</SelectItem>
              </SelectContent>
            </Select>
            {activeFilters > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-1 text-xs"
                onClick={() => { setSearch(''); setOrigemFilter('all'); setTagFilter('all'); }}
              >
                <X className="h-3.5 w-3.5" /> Limpar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDndStart}
        onDragCancel={() => setActiveLead(null)}
        onDragEnd={handleDndEnd}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map(col => (
            <KanbanColumn
              key={col.status}
              config={col}
              leads={getFilteredByStatus(col.status)}
              onStatusChange={updateLeadStatus}
              onUpdateDetails={updateLeadDetails}
              onDelete={deleteLead}
              isPro={isPro}
              activeStatus={activeLead?.status ?? null}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeLead ? (
            <LeadCard
              lead={activeLead}
              onStatusChange={updateLeadStatus}
              onUpdateDetails={updateLeadDetails}
              onDelete={deleteLead}
              isPro={isPro}
              isOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Pro Features Teaser */}
      {!isPro && (
        <Card className="border-dashed border-2 border-muted-foreground/20 bg-gradient-to-br from-card to-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold">Máquina de Fidelização</h3>
                <p className="text-xs text-muted-foreground">Disponível no plano Pro</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {[
                { icon: <Users className="w-4 h-4" />, text: 'Leads ilimitados' },
                { icon: <Zap className="w-4 h-4" />, text: 'Score de engajamento' },
                { icon: <TrendingUp className="w-4 h-4" />, text: 'Status automático' },
                { icon: <Bell className="w-4 h-4" />, text: 'Alertas inteligentes' },
                { icon: <BarChart3 className="w-4 h-4" />, text: 'Métricas de conversão' },
                { icon: <Lock className="w-4 h-4" />, text: 'Colunas personalizáveis' },
              ].map((feat, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-primary">{feat.icon}</span>
                  {feat.text}
                </div>
              ))}
            </div>
            <Button className="w-full gap-2">
              <Crown className="w-4 h-4" /> Fazer Upgrade para Pro <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pro Metrics Dashboard */}
      {isPro && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { value: stats.totalLeads, label: 'Total Leads', color: '' },
            { value: `${stats.taxaConversao}%`, label: 'Taxa Conversão', color: 'text-green-400' },
            { value: stats.recorrentes, label: 'Recorrentes', color: 'text-blue-400' },
            { value: stats.inativos, label: 'Inativos', color: 'text-red-400' },
            { value: stats.interessados, label: 'Interessados', color: 'text-yellow-400' },
          ].map((m, i) => (
            <Card key={i} className="border-0 bg-card/50">
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
                <p className="text-xs text-muted-foreground">{m.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
