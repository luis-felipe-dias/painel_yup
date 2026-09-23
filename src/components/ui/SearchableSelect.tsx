import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { cn } from "../../utils/cn";

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  allLabel: string;
  placeholder?: string;
  className?: string;
}

// Combobox pesquisável pra substituir <select> nativo quando a lista
// passa de umas 20-30 opções (ex: 200+ categorias de produto) - digitar
// pra filtrar em vez de rolar uma lista gigante.
export function SearchableSelect({
  value,
  onChange,
  options,
  allLabel,
  placeholder = "Buscar...",
  className
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [termo, setTermo] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setTermo("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const filtradas = useMemo(() => {
    if (!termo.trim()) return options;
    const t = termo.trim().toLowerCase();
    return options.filter(opt => opt.toLowerCase().includes(t));
  }, [options, termo]);

  const handleSelect = (opt: string) => {
    onChange(opt);
    setOpen(false);
    setTermo("");
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#f5f5f7] dark:bg-[#2c2c2e] text-[#86868b] hover:text-[#1c1c1e] dark:hover:text-[#f5f5f7] transition-colors max-w-[180px]"
      >
        <span className="truncate">{value || allLabel}</span>
        <ChevronDown className="w-3 h-3 shrink-0" />
      </button>

      {value && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange("");
          }}
          className="absolute -right-1 -top-1 w-4 h-4 rounded-full bg-[#86868b] hover:bg-[#ff3b30] text-white flex items-center justify-center"
          title="Limpar categoria"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}

      {open && (
        <div className="absolute z-20 mt-1 w-64 max-h-72 overflow-hidden rounded-lg border border-[#e5e5ea] dark:border-[#38383a] bg-white dark:bg-[#1c1c1e] shadow-lg flex flex-col">
          <div className="relative p-2 border-b border-[#e5e5ea] dark:border-[#38383a] shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#86868b]" />
            <input
              ref={inputRef}
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder={placeholder}
              className="w-full h-8 pl-7 pr-2 text-sm rounded-md border border-input bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="overflow-y-auto scrollbar-custom">
            <button
              type="button"
              onClick={() => handleSelect("")}
              className={cn(
                "w-full text-left px-3 py-1.5 text-sm hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e]",
                !value && "font-semibold text-[#007aff]"
              )}
            >
              {allLabel}
            </button>
            {filtradas.length === 0 ? (
              <p className="px-3 py-2 text-xs text-[#86868b]">Nenhuma categoria encontrada</p>
            ) : (
              filtradas.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-sm truncate hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e]",
                    value === opt && "font-semibold text-[#007aff]"
                  )}
                  title={opt}
                >
                  {opt}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
