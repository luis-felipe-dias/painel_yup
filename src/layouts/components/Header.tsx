import { useLocation } from "react-router-dom";
import { Search, Moon, Sun, User, Bell, LogOut, Settings } from "lucide-react";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { cn } from "../../utils/cn";
import { useState } from "react";

export function Header() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { usuario, logout } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/" || path === "/dashboard") return "Dashboard";
    if (path === "/conversas") return "Conversas";
    if (path === "/configuracoes") return "Configurações";
    return "Página";
  };

  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === "/" || path === "/dashboard") return ["Início"];
    if (path === "/conversas") return ["Início", "Conversas"];
    if (path === "/configuracoes") return ["Início", "Configurações"];
    return ["Início", path.slice(1)];
  };

  return (
    <header className="h-16 border-b bg-[#f5f5f7] dark:bg-[#1c1c1e] border-[#e5e5ea] dark:border-[#38383a] px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">
          {getPageTitle()}
        </h1>
        <div className="flex items-center gap-1 text-sm text-[#86868b]">
          {getBreadcrumb().map((item, index) => (
            <span key={index} className="flex items-center">
              {index > 0 && <span className="mx-2">/</span>}
              <span className={cn(index === getBreadcrumb().length - 1 && "text-[#1c1c1e] dark:text-[#f5f5f7]")}>
                {item}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Barra de pesquisa */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
          <Input
            placeholder="Pesquisar..."
            className="pl-9 w-48 focus:w-64 transition-all duration-300 bg-[#f5f5f7] dark:bg-[#2c2c2e] border-0 text-[#1c1c1e] dark:text-[#f5f5f7] placeholder:text-[#86868b]"
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setSearchOpen(false)}
          />
        </div>

        {/* Botão de tema */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="rounded-full hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e] text-[#1c1c1e] dark:text-[#f5f5f7]"
        >
          {theme === "dark" ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </Button>

        {/* Botão de notificações */}
        <Button variant="ghost" size="icon" className="rounded-full hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e] text-[#1c1c1e] dark:text-[#f5f5f7] relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#ff3b30] rounded-full" />
        </Button>

        {/* Menu do Usuário */}
        <div className="flex items-center gap-2">
          {/* Informações do usuário */}
          <div className="text-right mr-2 hidden sm:block">
            <div className="text-sm font-medium text-[#1c1c1e] dark:text-[#f5f5f7]">
              {usuario?.nome || 'Usuário'}
            </div>
            <div className="text-xs text-[#86868b]">
              {usuario?.tipo || 'visitante'}
            </div>
          </div>

          {/* Avatar do usuário */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e]"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff6b6b] to-[#ff4757] flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
          </Button>

          {/* Botão de logout */}
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="rounded-full hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e] text-[#ff3b30]"
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}