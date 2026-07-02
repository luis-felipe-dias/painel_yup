import { 
  MessageSquare, 
  Users, 
  Clock, 
  CheckCircle,
  TrendingUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";

const stats = [
  {
    title: "Total de Conversas",
    value: "--",
    icon: MessageSquare,
    change: "+0%",
    color: "text-blue-500",
  },
  {
    title: "Clientes Ativos",
    value: "--",
    icon: Users,
    change: "+0%",
    color: "text-green-500",
  },
  {
    title: "Tempo Médio",
    value: "--",
    icon: Clock,
    change: "0min",
    color: "text-purple-500",
  },
  {
    title: "Taxa de Resolução",
    value: "--",
    icon: CheckCircle,
    change: "+0%",
    color: "text-orange-500",
  },
];

export default function Dashboard() {
  return (
    <div className="h-full overflow-y-auto scrollbar-custom p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Gráficos (placeholder) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Visão Geral</CardTitle>
            </CardHeader>
            <CardContent className="h-80 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Gráfico de conversas</p>
                <p className="text-sm">Em breve</p>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Distribuição</CardTitle>
            </CardHeader>
            <CardContent className="h-80 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Distribuição de clientes</p>
                <p className="text-sm">Em breve</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}