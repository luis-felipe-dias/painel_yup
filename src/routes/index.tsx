import { createBrowserRouter } from "react-router-dom";
import { AuthGuard } from "../contexts/AuthGuard";
import { RootLayout } from "../layouts/RootLayout";
import Dashboard from "../pages/Dashboard";
import Conversas from "../pages/Conversas";
import Grupos from "../pages/Grupos";
import Contatos from "../pages/Contatos";
import Configuracoes from "../pages/Configuracoes";
import RespostasRapidas from "../pages/RespostasRapidas";
import Estoque from "../pages/Estoque";
import Compras from "../pages/Compras";
import EstoqueMinimo from "../pages/EstoqueMinimo";
import Contagem from "../pages/Contagem";
import Metricas from "../pages/Metricas";
import Peper from "../pages/Peper";
import Login from "../pages/Login";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    element: <AuthGuard />,
    children: [
      {
        path: "/",
        element: <RootLayout />,
        children: [
          {
            index: true,
            element: <Dashboard />,
          },
          {
            path: "dashboard",
            element: <Dashboard />,
          },
          {
            path: "conversas",
            element: <Conversas />,
          },
          {
            path: "contatos",
            element: <Contatos />,
          },
          {
            path: "grupos",
            element: <Grupos />,
          },
          {
            path: "estoque",
            element: <AuthGuard requiredPermission="estoque" />,
            children: [
              {
                index: true,
                element: <Estoque />,
              },
            ],
          },
          {
            path: "compras",
            element: <AuthGuard requiredPermission="compras" />,
            children: [
              {
                index: true,
                element: <Compras />,
              },
            ],
          },
          {
            // A conferência tem barra própria e campo colado no teclado:
            // ela usa a tela inteira, por isso entra como rota irmã e não
            // dentro de outra página.
            path: "contagem",
            element: <AuthGuard requiredPermission="estoque" />,
            children: [
              {
                index: true,
                element: <Contagem />,
              },
            ],
          },
          {
            path: "estoque-minimo",
            element: <AuthGuard requiredPermission="estoque_minimo" />,
            children: [
              {
                index: true,
                element: <EstoqueMinimo />,
              },
            ],
          },
          {
            path: "metricas",
            element: <AuthGuard requiredPermission="metricas" />,
            children: [
              {
                index: true,
                element: <Metricas />,
              },
            ],
          },
          {
            // A Peper usa a permissao de conversas: quem atende e quem
            // corrige o que ela diz sao a mesma pessoa.
            path: "peper",
            element: <AuthGuard requiredPermission="conversas" />,
            children: [
              {
                index: true,
                element: <Peper />,
              },
            ],
          },
          {
            path: "respostas-rapidas",
            element: <AuthGuard requiredPermission="conversas" />,
            children: [
              {
                index: true,
                element: <RespostasRapidas />,
              },
            ],
          },
          {
            path: "configuracoes",
            element: <AuthGuard requiredPermission="configuracoes" />,
            children: [
              {
                index: true,
                element: <Configuracoes />,
              },
            ],
          },
        ],
      },
    ],
  },
]);