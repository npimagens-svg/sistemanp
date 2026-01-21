import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus, Check, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useAllServiceProducts, ServiceProduct } from "@/hooks/useServiceProducts";
import { useProducts, Product } from "@/hooks/useProducts";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProductUsage {
  id: string;
  product_id: string;
  product_name: string;
  quantity_units: number; // Full units/containers used
  quantity_fractional: number; // Fractional amount (ml, g, etc.)
  unit_of_measure: string;
  unit_quantity: number; // How much per container
  cost_per_unit: number;
  total_cost: number;
  isNew?: boolean;
}

interface ComandaServiceProductsProps {
  serviceId: string;
  serviceName: string;
  quantity: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onProductUsageChange: (serviceId: string, products: ProductUsage[]) => void;
  disabled?: boolean;
}

export function ComandaServiceProducts({
  serviceId,
  serviceName,
  quantity,
  isExpanded,
  onToggleExpand,
  onProductUsageChange,
  disabled = false,
}: ComandaServiceProductsProps) {
  const { getProductsForService } = useAllServiceProducts();
  const { products: allProducts } = useProducts();
  const [productUsages, setProductUsages] = useState<ProductUsage[]>([]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProductId, setNewProductId] = useState<string>("");
  const [newProductQty, setNewProductQty] = useState<number>(0);

  // Initialize products from service configuration
  useEffect(() => {
    const serviceProducts = getProductsForService(serviceId);
    const initialProducts: ProductUsage[] = serviceProducts.map((sp) => {
      const isFractional = ["ml", "g", "dosagem"].includes(sp.product?.unit_of_measure || "");
      const fractionalAmount = sp.quantity_per_use * quantity;
      const costPerUnit = (sp.product?.cost_price || 0) / (sp.product?.unit_quantity || 1);
      
      return {
        id: sp.id,
        product_id: sp.product_id,
        product_name: sp.product?.name || "Produto",
        quantity_units: 0,
        quantity_fractional: isFractional ? fractionalAmount : 0,
        unit_of_measure: sp.product?.unit_of_measure || "unidade",
        unit_quantity: sp.product?.unit_quantity || 1,
        cost_per_unit: costPerUnit,
        total_cost: costPerUnit * fractionalAmount,
      };
    });
    setProductUsages(initialProducts);
  }, [serviceId, quantity, getProductsForService]);

  // Notify parent of changes
  useEffect(() => {
    onProductUsageChange(serviceId, productUsages);
  }, [productUsages, serviceId, onProductUsageChange]);

  const updateProductUsage = (productId: string, field: 'quantity_units' | 'quantity_fractional', value: number) => {
    setProductUsages(prev => prev.map(p => {
      if (p.product_id !== productId) return p;
      const updated = { ...p, [field]: value };
      // Recalculate total based on fractional usage
      const isFractional = ["ml", "g", "dosagem"].includes(p.unit_of_measure);
      if (isFractional) {
        updated.total_cost = p.cost_per_unit * updated.quantity_fractional;
      } else {
        // For unit-based products, use units directly
        const effectiveQty = updated.quantity_units > 0 ? updated.quantity_units : (updated.quantity_fractional > 0 ? updated.quantity_fractional : 0);
        updated.total_cost = (p.cost_per_unit * p.unit_quantity) * effectiveQty;
      }
      return updated;
    }));
  };

  const removeProduct = (productId: string) => {
    setProductUsages(prev => prev.filter(p => p.product_id !== productId));
  };

  const handleAddProduct = () => {
    if (!newProductId) return;
    
    const product = allProducts.find(p => p.id === newProductId);
    if (!product) return;

    const isFractional = ["ml", "g", "dosagem"].includes(product.unit_of_measure || "");
    const costPerUnit = (product.cost_price || 0) / (product.unit_quantity || 1);
    
    const newUsage: ProductUsage = {
      id: `new_${Date.now()}`,
      product_id: product.id,
      product_name: product.name,
      quantity_units: isFractional ? 0 : newProductQty,
      quantity_fractional: isFractional ? newProductQty : 0,
      unit_of_measure: product.unit_of_measure || "unidade",
      unit_quantity: product.unit_quantity || 1,
      cost_per_unit: costPerUnit,
      total_cost: isFractional 
        ? costPerUnit * newProductQty 
        : (costPerUnit * (product.unit_quantity || 1)) * newProductQty,
      isNew: true,
    };

    setProductUsages(prev => [...prev, newUsage]);
    setNewProductId("");
    setNewProductQty(0);
    setIsAddingProduct(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const getUnitLabel = (unit: string) => {
    const labels: Record<string, string> = {
      ml: "ml",
      g: "g",
      dosagem: "dose",
      unidade: "un",
      cm: "cm",
      caixa: "cx",
      pacote: "pct",
    };
    return labels[unit] || unit;
  };

  const isFractional = (unit: string) => ["ml", "g", "dosagem"].includes(unit);

  // Filter available products (consumption products not already in list)
  const availableProducts = allProducts.filter(p => 
    p.is_for_consumption && 
    p.is_active && 
    !productUsages.some(pu => pu.product_id === p.id)
  );

  const totalProductCost = productUsages.reduce((acc, p) => acc + p.total_cost, 0);

  return (
    <div className="border-l-4 border-muted pl-4 py-2 bg-muted/20">
      <button
        onClick={onToggleExpand}
        className="flex items-center gap-2 w-full text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        disabled={disabled}
      >
        <Package className="h-4 w-4" />
        <span>Saídas no estoque (opcional)</span>
        <Badge variant="secondary" className="ml-auto mr-2">
          {productUsages.length} produto{productUsages.length !== 1 ? "s" : ""}
        </Badge>
        <span className="text-xs text-muted-foreground mr-2">
          {formatCurrency(totalProductCost)}
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-2">
          {productUsages.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Nenhum produto vinculado a este serviço
            </p>
          ) : (
            productUsages.map((product) => (
              <div 
                key={product.id} 
                className={cn(
                  "flex items-center gap-2 p-2 rounded-md bg-background border",
                  product.isNew && "border-primary/50"
                )}
              >
                <span className="flex-1 text-sm font-medium truncate max-w-[180px]" title={product.product_name}>
                  {product.product_name}
                </span>
                
                {isFractional(product.unit_of_measure) ? (
                  // Fractional product (ml, g, dosagem)
                  <>
                    <Input
                      type="number"
                      min="0"
                      className="w-16 h-8 text-center"
                      value={product.quantity_units}
                      onChange={(e) => updateProductUsage(product.product_id, 'quantity_units', parseInt(e.target.value) || 0)}
                      disabled={disabled}
                    />
                    <span className="text-xs text-muted-foreground">un</span>
                    <span className="text-muted-foreground">+</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      className="w-20 h-8 text-center"
                      value={product.quantity_fractional}
                      onChange={(e) => updateProductUsage(product.product_id, 'quantity_fractional', parseFloat(e.target.value) || 0)}
                      disabled={disabled}
                    />
                    <span className="text-xs text-muted-foreground">{getUnitLabel(product.unit_of_measure)}</span>
                  </>
                ) : (
                  // Unit-based product
                  <>
                    <Input
                      type="number"
                      min="0"
                      className="w-16 h-8 text-center"
                      value={product.quantity_units || product.quantity_fractional}
                      onChange={(e) => updateProductUsage(product.product_id, 'quantity_units', parseInt(e.target.value) || 0)}
                      disabled={disabled}
                    />
                    <span className="text-xs text-muted-foreground">unidades</span>
                  </>
                )}

                <span className="text-sm font-medium min-w-[80px] text-right">
                  {formatCurrency(product.total_cost)}
                </span>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-green-600"
                  disabled={disabled}
                >
                  <Check className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => removeProduct(product.product_id)}
                  disabled={disabled}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}

          {/* Add new product row */}
          {isAddingProduct ? (
            <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/30">
              <Select value={newProductId} onValueChange={setNewProductId}>
                <SelectTrigger className="flex-1 h-8">
                  <SelectValue placeholder="Selecione um Produto" />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Input
                type="number"
                min="0"
                step="0.1"
                placeholder="Qtd"
                className="w-20 h-8 text-center"
                value={newProductQty || ""}
                onChange={(e) => setNewProductQty(parseFloat(e.target.value) || 0)}
              />
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-green-600"
                onClick={handleAddProduct}
                disabled={!newProductId}
              >
                <Check className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setIsAddingProduct(false);
                  setNewProductId("");
                  setNewProductQty(0);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-primary"
              onClick={() => setIsAddingProduct(true)}
              disabled={disabled || availableProducts.length === 0}
            >
              <Plus className="h-4 w-4" />
              Adicionar Produto
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
