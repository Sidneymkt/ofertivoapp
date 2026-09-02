import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CATEGORIES } from '@/lib/categories';

interface CategorySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
}

const CategorySelect: React.FC<CategorySelectProps> = ({
  value,
  onValueChange,
  disabled = false,
  required = false
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="category">Categoria {required && <span className="text-red-500">*</span>}</Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled} required={required}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecione uma categoria" />
        </SelectTrigger>
        <SelectContent 
          className="bg-background border border-border z-50 max-h-[300px] overflow-y-auto"
          position="popper"
          sideOffset={5}
        >
          {CATEGORIES.map((category) => (
            <SelectItem 
              key={category.value} 
              value={category.value}
              className="hover:bg-accent focus:bg-accent cursor-pointer"
            >
              {category.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CategorySelect;
