import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { X, Tag, Loader2, TrendingUp, Plus, Search } from 'lucide-react'
import { useInterests } from '@/hooks/useInterests'
import { cn } from '@/lib/utils'

interface InterestSelectProps {
  value: string[]
  onChange: (interests: string[]) => void
  placeholder?: string
  maxInterests?: number
  showPopular?: boolean
  className?: string
}

export const InterestSelect: React.FC<InterestSelectProps> = ({
  value = [],
  onChange,
  placeholder = "Digite interesses...",
  maxInterests = 10,
  showPopular = true,
  className
}) => {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const { 
    interests: searchResults, 
    popularInterests, 
    loading, 
    debouncedSearch,
    normalizeInterest 
  } = useInterests()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Filtrar sugestões para não mostrar interesses já selecionados
  const filteredSuggestions = searchResults.filter(
    interest => !value.some(v => normalizeInterest(v) === interest.normalized_name)
  )

  // Interesses populares não selecionados
  const availablePopular = popularInterests
    .filter(interest => !value.some(v => normalizeInterest(v) === interest.normalized_name))
    .slice(0, 6)

  // Verificar se o input atual é um novo interesse
  const isNewInterest = inputValue.trim().length >= 2 && 
    !searchResults.some(s => s.normalized_name === normalizeInterest(inputValue)) &&
    !value.some(v => normalizeInterest(v) === normalizeInterest(inputValue))

  const addInterest = useCallback((interest: string) => {
    const trimmedInterest = interest.trim()
    if (!trimmedInterest) return
    
    const normalized = normalizeInterest(trimmedInterest)
    
    // Verificar se já existe (normalizado)
    if (value.some(v => normalizeInterest(v) === normalized)) {
      setInputValue('')
      setShowSuggestions(false)
      return
    }
    
    // Verificar limite
    if (value.length >= maxInterests) {
      return
    }
    
    onChange([...value, trimmedInterest])
    setInputValue('')
    setShowSuggestions(false)
    setHighlightedIndex(-1)
    inputRef.current?.focus()
  }, [value, onChange, maxInterests, normalizeInterest])

  const removeInterest = useCallback((interestToRemove: string) => {
    onChange(value.filter(interest => interest !== interestToRemove))
  }, [value, onChange])

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
        addInterest(filteredSuggestions[highlightedIndex].name)
      } else if (inputValue.trim()) {
        addInterest(inputValue)
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeInterest(value[value.length - 1])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setHighlightedIndex(-1)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex(prev => 
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setHighlightedIndex(-1)
    debouncedSearch(newValue)
    setShowSuggestions(newValue.length > 0)
  }

  // Fechar sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
        setHighlightedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const canAddMore = value.length < maxInterests

  return (
    <div className={cn("space-y-3", className)} ref={containerRef}>
      {/* Input principal */}
      <div className="relative">
        <div className={cn(
          "min-h-[44px] border rounded-lg p-2 bg-background transition-all",
          "focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent",
          !canAddMore && "opacity-60"
        )}>
          {/* Tags selecionadas */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {value.map((interest) => (
              <Badge 
                key={interest} 
                variant="secondary" 
                className="text-xs px-2 py-1 gap-1 bg-primary/10 text-primary hover:bg-primary/20"
              >
                <Tag className="w-3 h-3" />
                {interest}
                <button
                  type="button"
                  onClick={() => removeInterest(interest)}
                  className="ml-0.5 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5 transition-colors"
                  aria-label={`Remover ${interest}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          
          {/* Campo de input */}
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              onFocus={() => inputValue.length > 0 && setShowSuggestions(true)}
              placeholder={!canAddMore ? `Limite de ${maxInterests} atingido` : (value.length === 0 ? placeholder : "Adicionar mais...")}
              disabled={!canAddMore}
              className="border-0 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
            />
            {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </div>
        </div>
        
        {/* Dropdown de sugestões */}
        {showSuggestions && (filteredSuggestions.length > 0 || isNewInterest) && (
          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {/* Sugestões da busca */}
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => addInterest(suggestion.name)}
                className={cn(
                  "w-full text-left px-3 py-2.5 flex items-center gap-2 transition-colors text-sm",
                  highlightedIndex === index 
                    ? "bg-accent text-accent-foreground" 
                    : "hover:bg-accent/50"
                )}
              >
                <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="flex-1">{suggestion.name}</span>
                {suggestion.usage_count > 0 && (
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {suggestion.usage_count}x
                  </span>
                )}
              </button>
            ))}
            
            {/* Opção para criar novo interesse */}
            {isNewInterest && (
              <button
                type="button"
                onClick={() => addInterest(inputValue)}
                className="w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-accent/50 transition-colors text-sm border-t"
              >
                <Plus className="w-3.5 h-3.5 text-primary" />
                <span>
                  Criar interesse: <strong className="text-primary">{inputValue.trim()}</strong>
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Interesses populares */}
      {showPopular && availablePopular.length > 0 && value.length === 0 && !showSuggestions && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Populares</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {availablePopular.map((interest) => (
              <button
                key={interest.id}
                type="button"
                onClick={() => addInterest(interest.name)}
                disabled={!canAddMore}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full transition-colors",
                  "bg-muted hover:bg-primary/10 hover:text-primary",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <Plus className="w-3 h-3" />
                {interest.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Contador e ajuda */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <p>
          Digite para buscar ou criar novos interesses. Pressione Enter para adicionar.
        </p>
        <span className={cn(
          value.length >= maxInterests - 2 && "text-amber-500",
          value.length >= maxInterests && "text-destructive"
        )}>
          {value.length}/{maxInterests}
        </span>
      </div>
    </div>
  )
}
