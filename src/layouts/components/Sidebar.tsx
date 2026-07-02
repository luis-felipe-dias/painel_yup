import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  MessageSquare, 
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  MessageCircle
} from "lucide-react";
import { cn } from "../../utils/cn";
import { useState } from "react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface MenuItem {
  icon: any;
  label: string;
  path: string;
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: MessageSquare, label: "Conversas", path: "/conversas" },
];

const futureMenus: MenuItem[] = [
  { icon: Users, label: "Clientes", path: "/clientes" },
  { icon: Settings, label: "Configurações", path: "/configuracoes" },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const [isHovered, setIsHovered] = useState(false);

  const isExpanded = !collapsed || isHovered;

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
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#EA70B0]">
          <MessageCircle className="w-6 h-6 text-[#FEFDEB]" />
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
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  "hover:bg-[#DDE3F1] dark:hover:bg-[#2A3360]",
                  isActive 
                    ? "bg-[#EA70B0] text-[#FEFDEB] font-medium" 
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

          {isExpanded && (
            <div className="my-4 border-t border-[#DDE3F1] dark:border-[#2A3360]" />
          )}

          {futureMenus.map((item) => (
            <div
              key={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg opacity-50 cursor-not-allowed",
                "text-[#4A5080] dark:text-[#A5B0D0]"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {isExpanded && (
                <span className="transition-opacity duration-300">
                  {item.label}
                </span>
              )}
            </div>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-[#DDE3F1] dark:border-[#2A3360] p-3 shrink-0">
        <button
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-colors",
            "hover:bg-[#DDE3F1] dark:hover:bg-[#2A3360] text-[#4A5080] dark:text-[#A5B0D0] hover:text-[#272D4F] dark:hover:text-[#DDE3F1]"
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
          "hover:bg-[#DDE3F1] dark:hover:bg-[#2A3360] transition-colors"
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