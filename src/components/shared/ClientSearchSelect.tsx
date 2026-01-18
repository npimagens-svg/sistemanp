import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, Plus, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  name: string;
  phone?: string | null;
}

interface ClientSearchSelectProps {
  clients: Client[];
  value: string | null;
  onSelect: (clientId: string | null) => void;
  onCreateNew?: (name: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ClientSearchSelect({
  clients,
  value,
  onSelect,
  onCreateNew,
  placeholder = "Buscar cliente...",
  disabled = false,
}: ClientSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedClient = clients.find((c) => c.id === value);

  // Filter clients based on search
  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    (client.phone && client.phone.includes(search))
  );

  const showCreateButton = search.trim().length > 0 && 
    !filteredClients.some((c) => c.name.toLowerCase() === search.toLowerCase().trim());

  const handleSelect = (clientId: string) => {
    onSelect(clientId);
    setSearch("");
    setOpen(false);
  };

  const handleCreateNew = () => {
    if (onCreateNew && search.trim()) {
      onCreateNew(search.trim());
      setSearch("");
      setOpen(false);
    }
  };

  // Reset search when value changes externally
  useEffect(() => {
    if (selectedClient) {
      setSearch("");
    }
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            placeholder={placeholder}
            value={open ? search : (selectedClient?.name || "")}
            onChange={(e) => {
              e.stopPropagation();
              setSearch(e.target.value);
              if (!open) setOpen(true);
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (!open) setOpen(true);
            }}
            onFocus={() => {
              if (!open) setOpen(true);
            }}
            onKeyDown={(e) => {
              // Prevent popover from closing on typing
              e.stopPropagation();
            }}
            disabled={disabled}
            className="pl-9 pr-10"
          />
          {selectedClient && !open && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(null);
                setSearch("");
              }}
            >
              ×
            </Button>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandList>
            {filteredClients.length === 0 && !showCreateButton ? (
              <CommandEmpty>Nenhum cliente encontrado</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredClients.slice(0, 10).map((client) => (
                  <CommandItem
                    key={client.id}
                    value={client.id}
                    onSelect={() => handleSelect(client.id)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="font-medium">{client.name}</div>
                      {client.phone && (
                        <div className="text-xs text-muted-foreground">{client.phone}</div>
                      )}
                    </div>
                    {value === client.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {showCreateButton && onCreateNew && (
              <CommandGroup>
                <CommandItem
                  onSelect={handleCreateNew}
                  className="flex items-center gap-2 cursor-pointer text-primary border-t"
                >
                  <Plus className="h-4 w-4" />
                  <span>Cadastrar "{search.trim()}"</span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
