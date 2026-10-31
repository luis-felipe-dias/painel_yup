import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { cn } from "../utils/cn";

/**
 * Estrutura do painel.
 *
 * `ambiente` pinta o fundo com manchas suaves da paleta. Ele não é
 * decoração solta: o vidro da sidebar e do header só se lê como vidro se
 * houver alguma coisa atrás para desfocar. Sobre fundo chapado, vidro
 * vira um cinza sem graça.
 *
 * A largura da sidebar vive em UMA variável CSS (`--w-sidebar`), lida
 * pelo próprio Sidebar e pelo recuo do conteúdo. Antes o valor estava
 * repetido em classe Tailwind nos dois lugares e desencontrava na
 * animação de recolher.
 */
export function RootLayout() {
  const [recolhida, setRecolhida] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const medir = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setRecolhida(true);
    };
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);

  // Preferência de sidebar recolhida sobrevive ao F5 — o atendente que
  // trabalha em tela pequena não quer reabrir o menu toda manhã.
  useEffect(() => {
    if (isMobile) return;
    try {
      const salvo = localStorage.getItem("yup:sidebar-recolhida");
      if (salvo !== null) setRecolhida(salvo === "1");
    } catch {
      /* modo privado — segue com o padrão */
    }
  }, [isMobile]);

  const alternar = () => {
    setRecolhida((v) => {
      const novo = !v;
      try {
        if (!isMobile) localStorage.setItem("yup:sidebar-recolhida", novo ? "1" : "0");
      } catch {
        /* ignora */
      }
      return novo;
    });
  };

  return (
    <div
      className="ambiente flex h-screen overflow-hidden bg-background text-foreground"
      style={
        {
          "--w-sidebar": recolhida ? "76px" : "248px",
        } as React.CSSProperties
      }
    >
      <Sidebar collapsed={recolhida} onToggle={alternar} />

      <div className={cn("flex min-w-0 flex-1 flex-col transition-[margin] duration-300")}>
        <Header />
        <main className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
