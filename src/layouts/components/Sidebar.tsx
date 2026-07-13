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
  Bot
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

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard", permission: "dashboard" },
  { icon: MessageSquare, label: "Conversas", path: "/conversas", permission: "conversas" },
  { icon: BarChart3, label: "Métricas", path: "/metricas", permission: "metricas" },
  { icon: Users, label: "Clientes", path: "/clientes", permission: "clientes" },
  { icon: Settings, label: "Configurações", path: "/configuracoes", permission: "configuracoes" },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { hasPermission, logout } = useAuth();
  const [isHovered, setIsHovered] = useState(false);

  const isExpanded = !collapsed || isHovered;

  // Filtrar menus por permissão
  const filteredMenus = menuItems.filter(item => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  return (
    <aside
      className={cn(
        "relative flex flex-col h-full border-r bg-[#FEFDEB] dark:bg-[#272D4F] border-[#DDE3F1] dark:border-[#2A3360] transition-all duration-300",
        isExpanded ? "w-64" : "w-20"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-[#DDE3F1] dark:border-[#2A3360] shrink-0">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-[#EA70B0] to-[#D4508C]">
          <Bot className="w-6 h-6 text-[#FEFDEB]" />
        </div>
        {isExpanded && (
          <span className="font-semibold text-lg text-[#272D4F] dark:text-[#DDE3F1] transition-opacity duration-300">
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
                  "hover:bg-[#DDE3F1] dark:hover:bg-[#2A3360]",
                  isActive 
                    ? "bg-gradient-to-r from-[#EA70B0] to-[#D4508C] text-[#FEFDEB] font-medium shadow-md" 
                    : "text-[#4A5080] dark:text-[#A5B0D0] hover:text-[#272D4F] dark:hover:text-[#DDE3F1]"
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

          {/* Seção de menus futuros */}
          {isExpanded && filteredMenus.length > 0 && (
            <div className="my-4 border-t border-[#DDE3F1] dark:border-[#2A3360]" />
          )}

          {/* Menu de exemplo para features futuras */}
          <div
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg opacity-50 cursor-not-allowed",
              "text-[#4A5080] dark:text-[#A5B0D0]"
            )}
          >
            <Bot className="w-5 h-5 shrink-0" />
            {isExpanded && (
              <span className="transition-opacity duration-300">
                Assistente IA (Em breve)
              </span>
            )}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-[#DDE3F1] dark:border-[#2A3360] p-3 shrink-0 space-y-2">
        {/* Informações do usuário */}
        {isExpanded && (
          <div className="px-3 py-2">
            <div className="text-sm font-medium text-[#272D4F] dark:text-[#DDE3F1]">
              Usuário
            </div>
            <div className="text-xs text-[#4A5080] dark:text-[#A5B0D0]">
              admin@example.com
            </div>
          </div>
        )}
        
        {/* Botão de logout */}
        <button
          onClick={logout}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-colors",
            "hover:bg-[#DDE3F1] dark:hover:bg-[#2A3360] text-[#4A5080] dark:text-[#A5B0D0] hover:text-[#E84D5C] dark:hover:text-[#FF6B7A]"
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
          "absolute -right-3 top-20 p-1.5 rounded-full border bg-[#FEFDEB] dark:bg-[#272D4F] border-[#DDE3F1] dark:border-[#2A3360] shadow-md",
          "hover:bg-[#DDE3F1] dark:hover:bg-[#2A3360] transition-colors z-10"
        )}
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-[#4A5080] dark:text-[#A5B0D0]" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-[#4A5080] dark:text-[#A5B0D0]" />
        )}
      </button>
    </aside>
  );
}