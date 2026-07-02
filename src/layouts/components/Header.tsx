import { useLocation } from "react-router-dom";
import { Search, Moon, Sun, User, Bell } from "lucide-react";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useTheme } from "../../contexts/ThemeContext";
import { cn } from "../../utils/cn";
import { useState } from "react";

export function Header() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/") return "Dashboard";
    if (path === "/conversas") return "Conversas";
    return "Página";
  };

  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === "/") return ["Início"];
    if (path === "/conversas") return ["Início", "Conversas"];
    return ["Início", path.slice(1)];
  };

  return (
    <header className="h-16 border-b bg-[#FEFDEB] dark:bg-[#272D4F] border-[#DDE3F1] dark:border-[#2A3360] px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-[#272D4F] dark:text-[#DDE3F1]">
          {getPageTitle()}
        </h1>
        <div className="flex items-center gap-1 text-sm text-[#4A5080] dark:text-[#A5B0D0]">
          {getBreadcrumb().map((item, index) => (
            <span key={index} className="flex items-center">
              {index > 0 && <span className="mx-2">/</span>}
              <span className={cn(index === getBreadcrumb().length - 1 && "text-[#272D4F] dark:text-[#DDE3F1]")}>
                {item}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A5080] dark:text-[#A5B0D0]" />
          <Input
            placeholder="Pesquisar..."
            className="pl-9 w-48 focus:w-64 transition-all duration-300 bg-white dark:bg-[#1B213B] border-[#DDE3F1] dark:border-[#2A3360] text-[#272D4F] dark:text-[#DDE3F1] placeholder:text-[#4A5080] dark:placeholder:text-[#A5B0D0]"
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setSearchOpen(false)}
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="rounded-full hover:bg-[#DDE3F1] dark:hover:bg-[#2A3360] text-[#272D4F] dark:text-[#DDE3F1]"
        >
          {theme === "dark" ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </Button>

        <Button variant="ghost" size="icon" className="rounded-full hover:bg-[#DDE3F1] dark:hover:bg-[#2A3360] text-[#272D4F] dark:text-[#DDE3F1] relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#F15040] rounded-full" />
        </Button>

        <Button variant="ghost" size="icon" className="rounded-full hover:bg-[#DDE3F1] dark:hover:bg-[#2A3360]">
          <div className="w-8 h-8 rounded-full bg-[#EA70B0] flex items-center justify-center">
            <User className="w-4 h-4 text-[#FEFDEB]" />
          </div>
        </Button>
      </div>
    </header>
  );
}