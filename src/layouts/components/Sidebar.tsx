import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  MessageSquare, 
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  BarChart3,
  Package,
  ShoppingCart,
  Layers
} from "lucide-react";
import { cn } from "../../utils/cn";
import { useAuth } from "../../contexts/AuthContext";
import { useState } from "react";

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

  const isExpanded = !collapsed || isHovered;

  const menuItems: MenuItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard", permission: "dashboard" },
    { icon: MessageSquare, label: "Conversas", path: "/conversas", permission: "conversas" },
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

  return (
    <aside
      className={cn(
        "relative flex flex-col h-full border-r bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl border-[#e5e5ea] dark:border-[#38383a] transition-all duration-300",
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
}