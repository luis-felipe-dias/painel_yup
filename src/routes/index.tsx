import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "../layouts/RootLayout";
import Dashboard from "../pages/Dashboard";
import Conversas from "../pages/Conversas";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: "conversas",
        element: <Conversas />,
      },
    ],
  },
]);