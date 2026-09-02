import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, X, FileImage, Calendar, Users, Gift, MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface FormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'cpf' | 'date' | 'file' | 'select' | 'checkbox';
  label: string;
  required: boolean;
  options?: string[];
  validation?: string;
}

interface CampaignConfig {
  title: string;
  description: string;
  regulation: string;
  startDate: string;
  endDate: string;
  drawDate: string;
  eligibilityRules: {
    maxEntriesPerCpf: number;
    maxEntriesPerPurchase: number;
    minPurchaseAmount: number;
    allowedRegions: string[];
    ageRestriction: number;
  };
  prizeStructure: {
    mainPrizes: Array<{
      name: string;
      description: string;
      quantity: number;
      value: number;
    }>;
    instantPrizes: Array<{
      name: string;
      probability: number;
      quantity: number;
    }>;
  };
  formFields: FormField[];
  drawMethod: 'loteria_federal' | 'random' | 'sequential';
  regionalization: boolean;
  allowedStores: string[];
}

interface CampaignFormBuilderProps {
  onSave: (config: CampaignConfig) => void;
  initialConfig?: Partial<CampaignConfig>;
}

export const CampaignFormBuilder: React.FC<CampaignFormBuilderProps> = ({
  onSave,
  initialConfig
}) => {
  const [config, setConfig] = useState<CampaignConfig>({
    title: '',
    description: '',
    regulation: '',
    startDate: '',
    endDate: '',
    drawDate: '',
    eligibilityRules: {
      maxEntriesPerCpf: 1,
      maxEntriesPerPurchase: 1,
      minPurchaseAmount: 0,
      allowedRegions: [],
      ageRestriction: 18
    },
    prizeStructure: {
      mainPrizes: [],
      instantPrizes: []
    },
    formFields: [
      { id: '1', type: 'text', label: 'Nome Completo', required: true },
      { id: '2', type: 'email', label: 'E-mail', required: true },
      { id: '3', type: 'cpf', label: 'CPF', required: true },
      { id: '4', type: 'phone', label: 'Telefone', required: true }
    ],
    drawMethod: 'random',
    regionalization: false,
    allowedStores: [],
    ...initialConfig
  });

  const [activeTab, setActiveTab] = useState('basic');

  const addFormField = () => {
    const newField: FormField = {
      id: Date.now().toString(),
      type: 'text',
      label: 'Novo Campo',
      required: false
    };
    setConfig(prev => ({
      ...prev,
      formFields: [...prev.formFields, newField]
    }));
  };

  const removeFormField = (id: string) => {
    setConfig(prev => ({
      ...prev,
      formFields: prev.formFields.filter(field => field.id !== id)
    }));
  };

  const updateFormField = (id: string, updates: Partial<FormField>) => {
    setConfig(prev => ({
      ...prev,
      formFields: prev.formFields.map(field =>
        field.id === id ? { ...field, ...updates } : field
      )
    }));
  };

  const addMainPrize = () => {
    setConfig(prev => ({
      ...prev,
      prizeStructure: {
        ...prev.prizeStructure,
        mainPrizes: [
          ...prev.prizeStructure.mainPrizes,
          { name: '', description: '', quantity: 1, value: 0 }
        ]
      }
    }));
  };

  const removeMainPrize = (index: number) => {
    setConfig(prev => ({
      ...prev,
      prizeStructure: {
        ...prev.prizeStructure,
        mainPrizes: prev.prizeStructure.mainPrizes.filter((_, i) => i !== index)
      }
    }));
  };

  const addInstantPrize = () => {
    setConfig(prev => ({
      ...prev,
      prizeStructure: {
        ...prev.prizeStructure,
        instantPrizes: [
          ...prev.prizeStructure.instantPrizes,
          { name: '', probability: 0.1, quantity: 100 }
        ]
      }
    }));
  };

  const handleSave = () => {
    // Validação básica
    if (!config.title || !config.startDate || !config.endDate || !config.drawDate) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (new Date(config.startDate) >= new Date(config.endDate)) {
      toast.error('Data de início deve ser anterior à data de encerramento');
      return;
    }

    if (new Date(config.drawDate) <= new Date(config.endDate)) {
      toast.error('Data do sorteio deve ser posterior ao encerramento');
      return;
    }

    onSave(config);
    toast.success('Configuração salva com sucesso!');
  };

  const tabs = [
    { id: 'basic', label: 'Informações Básicas', icon: FileImage },
    { id: 'rules', label: 'Regras de Elegibilidade', icon: Users },
    { id: 'prizes', label: 'Estrutura de Prêmios', icon: Gift },
    { id: 'form', label: 'Formulário Personalizado', icon: FileImage },
    { id: 'draw', label: 'Configuração do Sorteio', icon: Calendar }
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-6 w-6" />
            Configuração de Campanha de Sorteio
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-2 mb-6 border-b pb-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Button>
              );
            })}
          </div>

          {/* Basic Information Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Título da Campanha *</Label>
                  <Input
                    id="title"
                    value={config.title}
                    onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ex: Promoção Black Friday 2024"
                  />
                </div>
                <div>
                  <Label htmlFor="drawMethod">Método de Sorteio</Label>
                  <Select
                    value={config.drawMethod}
                    onValueChange={(value: typeof config.drawMethod) => 
                      setConfig(prev => ({ ...prev, drawMethod: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="loteria_federal">Loteria Federal</SelectItem>
                      <SelectItem value="random">Sorteio Aleatório</SelectItem>
                      <SelectItem value="sequential">Sequencial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={config.description}
                  onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva a campanha de sorteio..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="regulation">Regulamento</Label>
                <Textarea
                  id="regulation"
                  value={config.regulation}
                  onChange={(e) => setConfig(prev => ({ ...prev, regulation: e.target.value }))}
                  placeholder="Digite o regulamento completo da campanha..."
                  rows={6}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="startDate">Data de Início *</Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={config.startDate}
                    onChange={(e) => setConfig(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Data de Encerramento *</Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={config.endDate}
                    onChange={(e) => setConfig(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="drawDate">Data do Sorteio *</Label>
                  <Input
                    id="drawDate"
                    type="datetime-local"
                    value={config.drawDate}
                    onChange={(e) => setConfig(prev => ({ ...prev, drawDate: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Eligibility Rules Tab */}
          {activeTab === 'rules' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="maxEntriesPerCpf">Máx. Participações por CPF</Label>
                  <Input
                    id="maxEntriesPerCpf"
                    type="number"
                    min="1"
                    value={config.eligibilityRules.maxEntriesPerCpf}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      eligibilityRules: {
                        ...prev.eligibilityRules,
                        maxEntriesPerCpf: parseInt(e.target.value) || 1
                      }
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="maxEntriesPerPurchase">Números por Compra</Label>
                  <Input
                    id="maxEntriesPerPurchase"
                    type="number"
                    min="1"
                    value={config.eligibilityRules.maxEntriesPerPurchase}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      eligibilityRules: {
                        ...prev.eligibilityRules,
                        maxEntriesPerPurchase: parseInt(e.target.value) || 1
                      }
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="minPurchaseAmount">Valor Mínimo da Compra</Label>
                  <Input
                    id="minPurchaseAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={config.eligibilityRules.minPurchaseAmount}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      eligibilityRules: {
                        ...prev.eligibilityRules,
                        minPurchaseAmount: parseFloat(e.target.value) || 0
                      }
                    }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="ageRestriction">Idade Mínima</Label>
                <Input
                  id="ageRestriction"
                  type="number"
                  min="0"
                  max="100"
                  value={config.eligibilityRules.ageRestriction}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    eligibilityRules: {
                      ...prev.eligibilityRules,
                      ageRestriction: parseInt(e.target.value) || 18
                    }
                  }))}
                  className="max-w-32"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="regionalization"
                    checked={config.regionalization}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, regionalization: checked }))}
                  />
                  <Label htmlFor="regionalization">Ativar Regionalização</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Permite definir regiões específicas para participação
                </p>
              </div>
            </div>
          )}

          {/* Prize Structure Tab */}
          {activeTab === 'prizes' && (
            <div className="space-y-6">
              {/* Main Prizes */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Prêmios Principais</h3>
                  <Button onClick={addMainPrize} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Prêmio
                  </Button>
                </div>

                <div className="space-y-4">
                  {config.prizeStructure.mainPrizes.map((prize, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium">Prêmio {index + 1}</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMainPrize(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <Label>Nome do Prêmio</Label>
                            <Input
                              value={prize.name}
                              onChange={(e) => {
                                const newPrizes = [...config.prizeStructure.mainPrizes];
                                newPrizes[index].name = e.target.value;
                                setConfig(prev => ({
                                  ...prev,
                                  prizeStructure: {
                                    ...prev.prizeStructure,
                                    mainPrizes: newPrizes
                                  }
                                }));
                              }}
                              placeholder="Ex: iPhone 15"
                            />
                          </div>
                          <div>
                            <Label>Descrição</Label>
                            <Input
                              value={prize.description}
                              onChange={(e) => {
                                const newPrizes = [...config.prizeStructure.mainPrizes];
                                newPrizes[index].description = e.target.value;
                                setConfig(prev => ({
                                  ...prev,
                                  prizeStructure: {
                                    ...prev.prizeStructure,
                                    mainPrizes: newPrizes
                                  }
                                }));
                              }}
                              placeholder="Cor, modelo, etc."
                            />
                          </div>
                          <div>
                            <Label>Quantidade</Label>
                            <Input
                              type="number"
                              min="1"
                              value={prize.quantity}
                              onChange={(e) => {
                                const newPrizes = [...config.prizeStructure.mainPrizes];
                                newPrizes[index].quantity = parseInt(e.target.value) || 1;
                                setConfig(prev => ({
                                  ...prev,
                                  prizeStructure: {
                                    ...prev.prizeStructure,
                                    mainPrizes: newPrizes
                                  }
                                }));
                              }}
                            />
                          </div>
                          <div>
                            <Label>Valor (R$)</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={prize.value}
                              onChange={(e) => {
                                const newPrizes = [...config.prizeStructure.mainPrizes];
                                newPrizes[index].value = parseFloat(e.target.value) || 0;
                                setConfig(prev => ({
                                  ...prev,
                                  prizeStructure: {
                                    ...prev.prizeStructure,
                                    mainPrizes: newPrizes
                                  }
                                }));
                              }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Instant Prizes */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Prêmios Instantâneos</h3>
                  <Button onClick={addInstantPrize} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Prêmio Instantâneo
                  </Button>
                </div>

                <div className="space-y-4">
                  {config.prizeStructure.instantPrizes.map((prize, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium">Prêmio Instantâneo {index + 1}</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setConfig(prev => ({
                                ...prev,
                                prizeStructure: {
                                  ...prev.prizeStructure,
                                  instantPrizes: prev.prizeStructure.instantPrizes.filter((_, i) => i !== index)
                                }
                              }));
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label>Nome do Prêmio</Label>
                            <Input
                              value={prize.name}
                              onChange={(e) => {
                                const newPrizes = [...config.prizeStructure.instantPrizes];
                                newPrizes[index].name = e.target.value;
                                setConfig(prev => ({
                                  ...prev,
                                  prizeStructure: {
                                    ...prev.prizeStructure,
                                    instantPrizes: newPrizes
                                  }
                                }));
                              }}
                              placeholder="Ex: Cupom 10% desconto"
                            />
                          </div>
                          <div>
                            <Label>Probabilidade (%)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={prize.probability * 100}
                              onChange={(e) => {
                                const newPrizes = [...config.prizeStructure.instantPrizes];
                                newPrizes[index].probability = (parseFloat(e.target.value) || 0) / 100;
                                setConfig(prev => ({
                                  ...prev,
                                  prizeStructure: {
                                    ...prev.prizeStructure,
                                    instantPrizes: newPrizes
                                  }
                                }));
                              }}
                            />
                          </div>
                          <div>
                            <Label>Quantidade Disponível</Label>
                            <Input
                              type="number"
                              min="1"
                              value={prize.quantity}
                              onChange={(e) => {
                                const newPrizes = [...config.prizeStructure.instantPrizes];
                                newPrizes[index].quantity = parseInt(e.target.value) || 1;
                                setConfig(prev => ({
                                  ...prev,
                                  prizeStructure: {
                                    ...prev.prizeStructure,
                                    instantPrizes: newPrizes
                                  }
                                }));
                              }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Form Builder Tab */}
          {activeTab === 'form' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Campos do Formulário</h3>
                <Button onClick={addFormField} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Campo
                </Button>
              </div>

              <div className="space-y-4">
                {config.formFields.map((field) => (
                  <Card key={field.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Badge variant={field.required ? 'destructive' : 'secondary'}>
                            {field.required ? 'Obrigatório' : 'Opcional'}
                          </Badge>
                          <Badge variant="outline">{field.type}</Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFormField(field.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label>Rótulo do Campo</Label>
                          <Input
                            value={field.label}
                            onChange={(e) => updateFormField(field.id, { label: e.target.value })}
                            placeholder="Ex: Nome Completo"
                          />
                        </div>
                        <div>
                          <Label>Tipo do Campo</Label>
                          <Select
                            value={field.type}
                            onValueChange={(value: FormField['type']) => updateFormField(field.id, { type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Texto</SelectItem>
                              <SelectItem value="email">E-mail</SelectItem>
                              <SelectItem value="phone">Telefone</SelectItem>
                              <SelectItem value="cpf">CPF</SelectItem>
                              <SelectItem value="date">Data</SelectItem>
                              <SelectItem value="file">Arquivo</SelectItem>
                              <SelectItem value="select">Seleção</SelectItem>
                              <SelectItem value="checkbox">Checkbox</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={field.required}
                            onCheckedChange={(checked) => updateFormField(field.id, { required: checked })}
                          />
                          <Label>Campo Obrigatório</Label>
                        </div>
                      </div>

                      {field.type === 'select' && (
                        <div className="mt-4">
                          <Label>Opções (uma por linha)</Label>
                          <Textarea
                            value={field.options?.join('\n') || ''}
                            onChange={(e) => updateFormField(field.id, { 
                              options: e.target.value.split('\n').filter(opt => opt.trim()) 
                            })}
                            placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
                            rows={3}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Draw Configuration Tab */}
          {activeTab === 'draw' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Algoritmo de Apuração</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Método de Sorteio</Label>
                      <Select
                        value={config.drawMethod}
                        onValueChange={(value: typeof config.drawMethod) => 
                          setConfig(prev => ({ ...prev, drawMethod: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="loteria_federal">
                            <div>
                              <div className="font-medium">Loteria Federal</div>
                              <div className="text-sm text-muted-foreground">
                                Baseado no resultado oficial da Loteria Federal
                              </div>
                            </div>
                          </SelectItem>
                          <SelectItem value="random">
                            <div>
                              <div className="font-medium">Sorteio Aleatório</div>
                              <div className="text-sm text-muted-foreground">
                                Algoritmo pseudoaleatório seguro
                              </div>
                            </div>
                          </SelectItem>
                          <SelectItem value="sequential">
                            <div>
                              <div className="font-medium">Sequencial</div>
                              <div className="text-sm text-muted-foreground">
                                Por ordem de participação
                              </div>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {config.drawMethod === 'loteria_federal' && (
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium mb-2">Como funciona:</h4>
                        <ul className="text-sm space-y-1 text-muted-foreground">
                          <li>• Utiliza os números oficiais da Loteria Federal</li>
                          <li>• Garante total transparência e imparcialidade</li>
                          <li>• Resultado disponível após o sorteio oficial</li>
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Distribuição de Números</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Distribuição Proporcional</span>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Automação Completa</span>  
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Log de Auditoria</span>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Ata de Sorteio</span>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-6 border-t">
            <Button onClick={handleSave} size="lg" className="px-8">
              Salvar Configuração
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};