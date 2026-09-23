import { createBrowserRouter } from "react-router-dom";
import { AuthGuard } from "../contexts/AuthGuard";
import { RootLayout } from "../layouts/RootLayout";
import Dashboard from "../pages/Dashboard";
import Conversas from "../pages/Conversas";
import Contatos from "../pages/Contatos";
import Configuracoes from "../pages/Configuracoes";
import Estoque from "../pages/Estoque";
import Compras from "../pages/Compras";
import EstoqueMinimo from "../pages/EstoqueMinimo";
import Metricas from "../pages/Metricas";
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