import React, { useState } from 'react';
import { X, GripVertical, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DraggableImageGridProps {
  images: string[];
  onReorder: (newOrder: string[]) => void;
  onRemove: (index: number) => void;
  className?: string;
}

export const DraggableImageGrid: React.FC<DraggableImageGridProps> = ({
  images,
  onReorder,
  onRemove,
  className
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newImages = [...images];
    const [draggedItem] = newImages.splice(draggedIndex, 1);
    newImages.splice(dropIndex, 0, draggedItem);

    onReorder(newImages);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className={cn("grid grid-cols-2 gap-4", className)}>
      {images.map((image, index) => (
        <div
          key={`${image}-${index}`}
          draggable
          onDragStart={(e) => handleDragStart(e, index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
          className={cn(
            "relative group rounded-lg overflow-hidden border-2 transition-all duration-200 cursor-move",
            draggedIndex === index && "opacity-50 scale-95",
            dragOverIndex === index && draggedIndex !== index && "border-primary scale-105 shadow-lg",
            dragOverIndex !== index && draggedIndex !== index && "border-border hover:border-primary/50"
          )}
        >
          <div className="aspect-video relative bg-muted">
            <img
              src={image}
              alt={`Imagem ${index + 1}`}
              className="w-full h-full object-cover"
              draggable={false}
            />
            
            {/* Drag Handle */}
            <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm rounded-md p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>

            {/* Principal Badge */}
            {index === 0 && (
              <Badge 
                className="absolute top-2 right-2 bg-primary/90 backdrop-blur-sm gap-1"
              >
                <Star className="w-3 h-3 fill-current" />
                Principal
              </Badge>
            )}

            {/* Remove Button */}
            <Button
              variant="destructive"
              size="icon"
              className="absolute bottom-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(index);
              }}
            >
              <X className="w-4 h-4" />
            </Button>

            {/* Position Indicator */}
            <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm rounded-md px-2 py-1 text-xs font-medium">
              {index + 1}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
