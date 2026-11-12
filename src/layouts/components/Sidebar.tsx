import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Contact,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  BarChart3,
  Package,
  ShoppingCart,
  Layers,
  ScanLine,
  Menu,
  X,
  Zap,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { useAuth } from "../../contexts/AuthContext";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface ItemMenu {
  icon: any;
  label: string;
  path: string;
  permission?: string;
}

interface GrupoMenu {
  titulo: string;
  itens: ItemMenu[];
}

/**
 * O menu agora é AGRUPADO por natureza do trabalho, não uma lista corrida
 * de dez itens. Quem está atendendo cliente vive no primeiro bloco e nunca
 * precisa passar o olho pelos outros; quem faz compra vive no segundo.
 * Dez itens lado a lado sem hierarquia obrigam a reler todos toda vez.
 *
 * Nota de desempenho: antes, `DesktopSidebar` e `MobileSidebar` eram
 * declaradas DENTRO do componente. Isso cria um tipo de componente novo a
 * cada render, e o React desmonta e remonta a barra inteira — perdendo
 * estado e repintando tudo. Agora as partes são componentes de módulo.
 */
const GRUPOS: GrupoMenu[] = [
  {
    titulo: "Atendimento",
    itens: [
      { icon: MessageSquare, label: "Conversas", path: "/conversas", permission: "conversas" },
      { icon: Contact, label: "Contatos", path: "/contatos", permission: "conversas" },
      { icon: Users, label: "Grupos", path: "/grupos", permission: "conversas" },
      { icon: Zap, label: "Respostas rápidas", path: "/respostas-rapidas", permission: "conversas" },
    ],
  },
  {
    titulo: "Operação",
    itens: [
      { icon: Package, label: "Estoque", path: "/estoque", permission: "estoque" },
      { icon: ScanLine, label: "Conferência", path: "/contagem", permission: "estoque" },
      { icon: Layers, label: "Estoque mínimo", path: "/estoque-minimo", permission: "estoque_minimo" },
      { icon: ShoppingCart, label: "Compras", path: "/compras", permission: "compras" },
    ],
  },
  {
    titulo: "Gestão",
    itens: [
      { icon: LayoutDashboard, label: "Visão geral", path: "/dashboard", permission: "dashboard" },
      { icon: BarChart3, label: "Métricas", path: "/metricas", permission: "metricas" },
      { icon: Settings, label: "Configurações", path: "/configuracoes", permission: "configuracoes" },
    ],
  },
];

function Marca({ compacta }: { compacta: boolean }) {
  return (
    <div className="flex h-header shrink-0 items-center gap-2.5 px-4">
      {/* Aqui fica a LETRA, não a lâmpada. Testei a marca a 20, 24 e 28px
          dentro deste selo de 36: o contorno fino se funde e o bulbo vira
          um borrão — pior que nada. A marca inteira aparece no login, onde
          tem 96px para respirar. */}
      <div
        aria-hidden
        className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary text-[17px] font-black leading-none text-primary-foreground"
      >
        y
      </div>
      {!compacta && (
        <div className="min-w-0 leading-tight">
          <div className="truncate text-[14px] font-bold text-foreground">Central Yup</div>
          <div className="truncate text-[11px] text-muted-foreground">Atendimento e operação</div>
        </div>
      )}
    </div>
  );
}

function LinkMenu({
  item,
  compacto,
  onNavegar,
}: {
  item: ItemMenu;
  compacto: boolean;
  onNavegar?: () => void;
}) {
  return (
    <NavLink
      to={item.path}
      onClick={onNavegar}
      title={compacto ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          "foco-anel group relative flex h-10 items-center gap-3 rounded-md px-3 text-[13.5px] transition-colors",
          compacto && "justify-center px-0",
          isActive
            ? "bg-primary font-semibold text-primary-foreground"
            : "font-medium text-muted-foreground hover:bg-surface-muted hover:text-foreground"
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* No modo compacto a pílula some do olho: o traço na borda é o
              que confirma onde você está, como na lateral do macOS. */}
          <span
            aria-hidden
            className={cn(
              "absolute left-0 h-5 w-[3px] rounded-r-full bg-accent transition-opacity",
              isActive && compacto ? "opacity-100" : "opacity-0"
            )}
          />
          <item.icon className="h-[18px] w-[18px] shrink-0" />
          {!compacto && <span className="truncate">{item.label}</span>}
        </>
      )}
    </NavLink>
  );
}

function Conteudo({
  grupos,
  compacto,
  onNavegar,
  onSair,
}: {
  grupos: GrupoMenu[];
  compacto: boolean;
  onNavegar?: () => void;
  onSair: () => void;
}) {
  return (
    <>
      <Marca compacta={compacto} />

      <nav className="scrollbar-custom min-h-0 flex-1 overflow-y-auto px-2.5 pb-2">
        {grupos.map((grupo, i) => (
          <div key={grupo.titulo} className={cn(i > 0 && "mt-5")}>
            {!compacto ? (
              <div className="px-3 pb-1.5 text-[10.5px] font-bold uppercase tracking-[0.07em] text-muted-foreground/70">
                {grupo.titulo}
              </div>
            ) : (
              i > 0 && <div className="mx-auto mb-3 h-px w-7 bg-border" aria-hidden />
            )}
            <div className="space-y-0.5">
              {grupo.itens.map((item) => (
                <LinkMenu key={item.path} item={item} compacto={compacto} onNavegar={onNavegar} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-border/70 p-2.5">
        <button
          type="button"
          onClick={onSair}
          title={compacto ? "Sair" : undefined}
          className={cn(
            "foco-anel flex h-10 w-full items-center gap-3 rounded-md px-3 text-[13.5px] font-medium",
            "text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
            compacto && "justify-center px-0"
          )}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {!compacto && <span>Sair</span>}
        </button>
      </div>
    </>
  );
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { hasPermission, logout } = useAuth();
  const [mobileAberto, setMobileAberto] = useState(false);

  useEffect(() => {
    setMobileAberto(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileAberto) return;
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && setMobileAberto(false);
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [mobileAberto]);

  const gruposVisiveis = GRUPOS.map((g) => ({
    ...g,
    itens: g.itens.filter((i) => !i.permission || hasPermission(i.permission)),
  })).filter((g) => g.itens.length > 0);

  // O botão de Sair não tinha onClick nenhum — nem no desktop nem no
  // celular. Clicava e não acontecia nada.
  const sair = () => {
    if (window.confirm("Sair da Central Yup?")) logout();
  };

  return (
    <>
      {/* ---------- Desktop ---------- */}
      <aside
        style={{ width: "var(--w-sidebar)" }}
        className={cn(
          "glass relative z-20 hidden shrink-0 flex-col rounded-none border-y-0 border-l-0 md:flex",
          "transition-[width] duration-300 ease-out"
        )}
      >
        <Conteudo grupos={gruposVisiveis} compacto={collapsed} onSair={sair} />

        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          className="foco-anel glass-solid absolute -right-3 top-[72px] grid h-6 w-6 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
        >
          {collapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
        </button>
      </aside>

      {/* ---------- Celular ---------- */}
      <button
        type="button"
        onClick={() => setMobileAberto(true)}
        aria-label="Abrir menu"
        className="glass-solid foco-anel fixed left-3 top-3 z-40 grid h-10 w-10 place-items-center rounded-md text-foreground md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileAberto && (
        <div
          className="fixed inset-0 z-40 bg-noite/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileAberto(false)}
          aria-hidden
        />
      )}

      <div
        role="dialog"
        aria-label="Menu"
        aria-hidden={!mobileAberto}
        className={cn(
          "glass-solid fixed left-0 top-0 z-50 flex h-full w-[82vw] max-w-[300px] flex-col rounded-none",
          "transition-transform duration-300 ease-out md:hidden",
          mobileAberto ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          type="button"
          onClick={() => setMobileAberto(false)}
          aria-label="Fechar menu"
          className="foco-anel absolute right-2 top-3 grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-surface-muted"
        >
          <X className="h-5 w-5" />
        </button>
        <Conteudo
          grupos={gruposVisiveis}
          compacto={false}
          onNavegar={() => setMobileAberto(false)}
          onSair={sair}
        />
      </div>
    </>
  );
}
