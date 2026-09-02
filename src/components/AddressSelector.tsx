import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Check, Trash2, Edit } from 'lucide-react';
import { Address } from '@/hooks/useAddresses';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AddressSelectorProps {
  addresses: Address[];
  selectedId?: string;
  onSelect: (address: Address) => void;
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (address: Address) => void;
  loading?: boolean;
}

export const AddressSelector: React.FC<AddressSelectorProps> = ({
  addresses,
  selectedId,
  onSelect,
  onSetDefault,
  onDelete,
  onEdit,
  loading = false
}) => {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (addresses.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Nenhum endereço cadastrado</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {addresses.map((address) => (
        <Card
          key={address.id}
          className={`cursor-pointer transition-all hover:shadow-md ${
            selectedId === address.id ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => onSelect(address)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                  <h4 className="font-semibold text-sm truncate">{address.label}</h4>
                  {address.is_default && (
                    <Badge variant="secondary" className="ml-auto flex-shrink-0">
                      Padrão
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {address.formatted_address}
                </p>
                {address.latitude && address.longitude && (
                  <p className="text-xs text-muted-foreground mt-1">
                    📍 {address.latitude.toFixed(6)}, {address.longitude.toFixed(6)}
                  </p>
                )}
              </div>

              <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                {selectedId === address.id && (
                  <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(address);
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>

                {!address.is_default && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-blue-500 hover:text-blue-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetDefault(address.id);
                    }}
                    title="Definir como padrão"
                  >
                    <MapPin className="w-4 h-4" />
                  </Button>
                )}

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover endereço?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. O endereço será removido permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(address.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Remover
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
