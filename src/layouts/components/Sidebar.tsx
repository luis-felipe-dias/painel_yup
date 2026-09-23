import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard,
  MessageSquare,
  Users,
  Contact,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  BarChart3,
  Package,
  ShoppingCart,
  Layers,
  Menu,
  X
} from "lucide-react";
import { cn } from "../../utils/cn";
import { useAuth } from "../../contexts/AuthContext";
import { useState, useEffect } from "react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface MenuItem {
  icon: any;
  label: string;
  path: string;
  permission?: string;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { hasPermission } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isExpanded = !collapsed || isHovered;

  // Fechar menu mobile ao mudar de página
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const menuItems: MenuItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard", permission: "dashboard" },
    { icon: MessageSquare, label: "Conversas", path: "/conversas", permission: "conversas" },
    { icon: Contact, label: "Contatos", path: "/contatos", permission: "conversas" },
    { icon: Users, label: "Grupos", path: "/grupos", permission: "conversas" },
    { icon: Package, label: "Estoque", path: "/estoque", permission: "estoque" },
    { icon: ShoppingCart, label: "Compras ADM", path: "/compras", permission: "compras" },
    { icon: Layers, label: "Estoque Mínimo", path: "/estoque-minimo", permission: "estoque_minimo" },
    { icon: BarChart3, label: "Métricas", path: "/metricas", permission: "metricas" },
    { icon: Settings, label: "Configurações", path: "/configuracoes", permission: "configuracoes" },
  ];

  const filteredMenus = menuItems.filter(item => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  // Sidebar para desktop
  const DesktopSidebar = () => (
    <aside
      className={cn(
        "hidden md:flex relative flex-col h-full border-r bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl border-[#e5e5ea] dark:border-[#38383a] transition-all duration-300",
        isExpanded ? "w-64" : "w-20"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-[#e5e5ea] dark:border-[#38383a] shrink-0">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-[#007aff] to-[#5856d6]">
          <MessageCircle className="w-6 h-6 text-white" />
        </div>
        {isExpanded && (
          <span className="font-semibold text-lg text-[#1c1c1e] dark:text-[#f5f5f7] transition-opacity duration-300">
            WA Admin
          </span>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto scrollbar-custom px-3 py-4">
        <div className="space-y-1">
          {filteredMenus.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  "hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e]",
                  isActive 
                    ? "bg-[#007aff] text-white" 
                    : "text-[#86868b] hover:text-[#1c1c1e] dark:hover:text-[#f5f5f7]"
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {isExpanded && (
                  <span className="transition-opacity duration-300">
                    {item.label}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-[#e5e5ea] dark:border-[#38383a] p-3 shrink-0">
        <button
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-colors",
            "hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e] text-[#86868b] hover:text-[#ff3b30]"
          )}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {isExpanded && (
            <span className="transition-opacity duration-300">Sair</span>
          )}
        </button>
      </div>

      {/* Botão de Collapse */}
      <button
        onClick={onToggle}
        className={cn(
          "absolute -right-3 top-20 p-1.5 rounded-full border bg-white dark:bg-[#1c1c1e] border-[#e5e5ea] dark:border-[#38383a] shadow-md",
          "hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e] transition-colors"
        )}
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-[#86868b]" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-[#86868b]" />
        )}
      </button>
    </aside>
  );

  // Sidebar para mobile (overlay)
  const MobileSidebar = () => (
    <>
      {/* Botão Hamburguer - visível apenas em mobile */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl border border-[#e5e5ea] dark:border-[#38383a] shadow-lg"
      >
        <Menu className="w-6 h-6 text-[#1c1c1e] dark:text-[#f5f5f7]" />
      </button>

      {/* Overlay */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Menu Mobile */}
      <div
        className={cn(
          "md:hidden fixed top-0 left-0 z-50 h-full w-72 bg-white dark:bg-[#1c1c1e] shadow-xl transition-transform duration-300 ease-in-out",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header Mobile */}
          <div className="flex items-center justify-between px-4 h-16 border-b border-[#e5e5ea] dark:border-[#38383a] shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-[#007aff] to-[#5856d6]">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <span className="font-semibold text-lg text-[#1c1c1e] dark:text-[#f5f5f7]">
                WA Admin
              </span>
            </div>
            <button
              onClick={() => setIsMobileOpen(false)}
              className="p-2 rounded-lg hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e]"
            >
              <X className="w-5 h-5 text-[#1c1c1e] dark:text-[#f5f5f7]" />
            </button>
          </div>

          {/* Menu Mobile */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <div className="space-y-1">
              {filteredMenus.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200",
                      "hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e]",
                      isActive 
                        ? "bg-[#007aff] text-white" 
                        : "text-[#86868b] hover:text-[#1c1c1e] dark:hover:text-[#f5f5f7]"
                    )}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    <span className="text-sm font-medium">
                      {item.label}
                    </span>
                  </NavLink>
                );
              })}
            </div>
          </nav>

          {/* Footer Mobile */}
          <div className="border-t border-[#e5e5ea] dark:border-[#38383a] p-4 shrink-0">
            <button
              className={cn(
                "flex items-center gap-3 w-full px-3 py-3 rounded-lg transition-colors",
                "hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e] text-[#86868b] hover:text-[#ff3b30]"
              )}
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Sair</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <DesktopSidebar />
      <MobileSidebar />
    </>
  );
}
