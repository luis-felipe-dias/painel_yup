import { createBrowserRouter } from "react-router-dom";
import { AuthGuard } from "../contexts/AuthGuard";
import { RootLayout } from "../layouts/RootLayout";
import Dashboard from "../pages/Dashboard";
import Conversas from "../pages/Conversas";
import Configuracoes from "../pages/Configuracoes";
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