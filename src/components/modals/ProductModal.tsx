import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Product, ProductInput } from "@/hooks/useProducts";
import { Supplier } from "@/hooks/useSuppliers";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, Droplets, Scale } from "lucide-react";

interface ProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSubmit: (data: ProductInput & { id?: string; supplier_id?: string | null }) => void;
  isLoading?: boolean;
  suppliers?: Supplier[];
}

const UNIT_OPTIONS = [
  { value: "unidade", label: "Por Unidade", description: "Saída por unidade inteira (ex: shampoo para revenda)", icon: Package },
  { value: "ml", label: "Por Mililitro (ml)", description: "Saída fracionada em ml (ex: tinta, coloração)", icon: Droplets },
  { value: "g", label: "Por Grama (g)", description: "Saída fracionada em gramas (ex: pó descolorante)", icon: Scale },
];

export function ProductModal({ open, onOpenChange, product, onSubmit, isLoading, suppliers = [] }: ProductModalProps) {
  const isEditing = !!product;
  
  const [formData, setFormData] = useState<ProductInput & { supplier_id?: string | null }>({
    name: "",
    description: "",
    sku: "",
    category: "",
    brand: "",
    product_line: "",
    cost_price: 0,
    sale_price: 0,
    commission_percent: 0,
    current_stock: 0,
    current_stock_fractional: 0,
    min_stock: 0,
    is_active: true,
    supplier_id: null,
    unit_of_measure: "unidade",
    unit_quantity: 1,
    is_for_resale: true,
    is_for_consumption: true,
  });

  const isFractional = formData.unit_of_measure !== "unidade";
  const unitLabel = formData.unit_of_measure === "ml" ? "ml" : formData.unit_of_measure === "g" ? "g" : "un";

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || "",
        sku: product.sku || "",
        category: product.category || "",
        brand: product.brand || "",
        product_line: product.product_line || "",
        cost_price: Number(product.cost_price),
        sale_price: Number(product.sale_price),
        commission_percent: Number(product.commission_percent) || 0,
        current_stock: product.current_stock,
        current_stock_fractional: Number(product.current_stock_fractional) || 0,
        min_stock: product.min_stock,
        is_active: product.is_active,
        supplier_id: product.supplier_id || null,
        unit_of_measure: product.unit_of_measure || "unidade",
        unit_quantity: Number(product.unit_quantity) || 1,
        is_for_resale: product.is_for_resale ?? true,
        is_for_consumption: product.is_for_consumption ?? true,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        sku: "",
        category: "",
        brand: "",
        product_line: "",
        cost_price: 0,
        sale_price: 0,
        commission_percent: 0,
        current_stock: 0,
        current_stock_fractional: 0,
        min_stock: 0,
        is_active: true,
        supplier_id: null,
        unit_of_measure: "unidade",
        unit_quantity: 1,
        is_for_resale: true,
        is_for_consumption: true,
      });
    }
  }, [product, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (product) {
      onSubmit({ ...formData, id: product.id });
    } else {
      onSubmit(formData);
    }
    onOpenChange(false);
  };

  // Calculate cost per unit
  const costPerUnit = formData.cost_price && formData.unit_quantity 
    ? formData.cost_price / formData.unit_quantity 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Produto" : "Novo Produto"}</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          <form id="product-form" onSubmit={handleSubmit} className="space-y-6 pb-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label htmlFor="sku">Código (SKU/EAN)</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Código de barras"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">Marca</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product_line">Linha</Label>
                  <Input
                    id="product_line"
                    value={formData.product_line}
                    onChange={(e) => setFormData({ ...formData, product_line: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            {/* Product Characteristics */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Característica do Produto</Label>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_for_resale"
                    checked={formData.is_for_resale}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_for_resale: !!checked })}
                  />
                  <Label htmlFor="is_for_resale" className="font-normal cursor-pointer">
                    Venda
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_for_consumption"
                    checked={formData.is_for_consumption}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_for_consumption: !!checked })}
                  />
                  <Label htmlFor="is_for_consumption" className="font-normal cursor-pointer">
                    Consumo (uso em serviços)
                  </Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Unit of Measure - IMPORTANT SECTION */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Label className="text-base font-medium">Unidade de Medida</Label>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">Importante</span>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                {UNIT_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = formData.unit_of_measure === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData({ 
                        ...formData, 
                        unit_of_measure: option.value,
                        unit_quantity: option.value === "unidade" ? 1 : (formData.unit_quantity === 1 ? 1000 : formData.unit_quantity)
                      })}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        isSelected 
                          ? "border-primary bg-primary/5" 
                          : "border-muted hover:border-muted-foreground/30"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        <span className={`font-medium text-sm ${isSelected ? "text-primary" : ""}`}>
                          {option.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-tight">
                        {option.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Container Content - Show when fractional */}
              {isFractional && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="unit_quantity" className="flex items-center gap-2">
                      <span className="text-primary">●</span>
                      Qual o conteúdo de cada frasco/embalagem?
                    </Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="unit_quantity"
                        type="number"
                        min={1}
                        step={1}
                        value={formData.unit_quantity}
                        onChange={(e) => setFormData({ ...formData, unit_quantity: parseFloat(e.target.value) || 1 })}
                        className="max-w-[150px] bg-background"
                        placeholder="Ex: 1000"
                      />
                      <span className="text-sm font-medium">{unitLabel}</span>
                      <span className="text-sm text-muted-foreground">por unidade</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formData.unit_of_measure === "ml" 
                        ? "Exemplos: 1 litro = 1000ml, 5 litros = 5000ml, 500ml = 500ml"
                        : "Exemplos: 1 kg = 1000g, 500g = 500g, 250g = 250g"
                      }
                    </p>
                  </div>

                  {/* Cost per unit calculation */}
                  {costPerUnit > 0 && (
                    <div className="rounded-md bg-background p-3 text-sm space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Custo por {unitLabel}:</span>
                        <span className="font-bold text-primary">R$ {costPerUnit.toFixed(4)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        R$ {(formData.cost_price || 0).toFixed(2)} ÷ {formData.unit_quantity || 1} {unitLabel} = R$ {costPerUnit.toFixed(4)}/{unitLabel}
                      </p>
                      <div className="pt-2 border-t">
                        <p className="text-xs text-green-600">
                          ✓ Se usar 30{unitLabel} em um serviço, o custo será R$ {(costPerUnit * 30).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Pricing */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Valores</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cost_price">
                    Custo {isFractional ? "do Frasco" : ""} (R$)
                  </Label>
                  <Input
                    id="cost_price"
                    type="number"
                    min={0}
                    step={0.01}
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                  />
                  {isFractional && (
                    <p className="text-xs text-muted-foreground">
                      Custo total do frasco de {formData.unit_quantity}{unitLabel}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sale_price">Valor de Venda (R$)</Label>
                  <Input
                    id="sale_price"
                    type="number"
                    min={0}
                    step={0.01}
                    value={formData.sale_price}
                    onChange={(e) => setFormData({ ...formData, sale_price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commission_percent">Comissão (%)</Label>
                  <Input
                    id="commission_percent"
                    type="number"
                    min={0}
                    max={100}
                    value={formData.commission_percent}
                    onChange={(e) => setFormData({ ...formData, commission_percent: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Supplier */}
            <div className="space-y-2">
              <Label htmlFor="supplier">Fornecedor</Label>
              <Select
                value={formData.supplier_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, supplier_id: value === "none" ? null : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {suppliers
                    .filter(s => s.is_active)
                    .map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Stock - HIGHLIGHTED FOR NEW PRODUCTS */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Label className="text-base font-medium">Estoque</Label>
                {!isEditing && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">
                    Entrada Inicial
                  </span>
                )}
              </div>
              
              <div className={`space-y-4 ${!isEditing ? "rounded-lg border border-green-200 bg-green-50/50 p-4" : ""}`}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="current_stock">
                      {isEditing ? "Estoque Atual" : "Quantidade Inicial"} (unidades/frascos)
                    </Label>
                    <Input
                      id="current_stock"
                      type="number"
                      min={0}
                      value={formData.current_stock}
                      onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value) || 0 })}
                      className={!isEditing ? "bg-white border-green-300" : ""}
                    />
                    {!isEditing && (
                      <p className="text-xs text-green-700">
                        Quantos frascos/unidades você tem em estoque agora?
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="min_stock">Estoque Mínimo (alerta)</Label>
                    <Input
                      id="min_stock"
                      type="number"
                      min={0}
                      value={formData.min_stock}
                      onChange={(e) => setFormData({ ...formData, min_stock: parseInt(e.target.value) || 0 })}
                      className={!isEditing ? "bg-white" : ""}
                    />
                    <p className="text-xs text-muted-foreground">
                      Alerta quando estoque ficar abaixo
                    </p>
                  </div>
                </div>

                {/* Fractional stock - only for editing */}
                {isFractional && isEditing && (
                  <div className="space-y-2">
                    <Label htmlFor="current_stock_fractional">
                      Estoque Fracionado ({unitLabel} restante da unidade aberta)
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="current_stock_fractional"
                        type="number"
                        min={0}
                        step={0.01}
                        value={formData.current_stock_fractional}
                        onChange={(e) => setFormData({ ...formData, current_stock_fractional: parseFloat(e.target.value) || 0 })}
                        className="max-w-32"
                      />
                      <span className="text-sm text-muted-foreground">{unitLabel}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Quantidade restante do frasco/unidade que já foi aberta
                    </p>
                  </div>
                )}

                {/* Stock Summary */}
                {isFractional && formData.current_stock > 0 && (
                  <div className="bg-muted/50 rounded-lg p-3 text-sm">
                    <p className="font-medium">Total em Estoque:</p>
                    <p className="text-muted-foreground">
                      {formData.current_stock} unidade(s) fechada(s) 
                      {isEditing && formData.current_stock_fractional > 0 && ` + ${formData.current_stock_fractional} ${unitLabel} de frasco aberto`}
                      {" = "}
                      <span className="font-medium text-foreground">
                        {((formData.current_stock * formData.unit_quantity) + (isEditing ? (formData.current_stock_fractional || 0) : 0)).toLocaleString("pt-BR")} {unitLabel} total
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Status */}
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Produto Ativo</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </form>
        </ScrollArea>

        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="product-form" disabled={isLoading}>
            {isLoading ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
