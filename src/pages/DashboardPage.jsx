import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import supabase from "@/utils/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Package,
  CalendarClock,
  AlertTriangle,
  Wrench,
  Plus,
  ArrowRight,
} from "lucide-react";

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    properties: 0,
    assets: 0,
    upcomingTasks: 0,
    overdueTasks: 0,
  });
  const [recentServices, setRecentServices] = useState([]);
  const [endOfLifeAssets, setEndOfLifeAssets] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  async function fetchDashboardData() {
    try {
      const [
        { count: propertyCount },
        { count: assetCount },
        { data: tasks },
        { data: services },
        { data: lifecycle },
      ] = await Promise.all([
        supabase
          .from("properties")
          .select("*", { count: "exact", head: true })
          .eq("is_archived", false),
        supabase
          .from("assets")
          .select("*", { count: "exact", head: true })
          .eq("is_archived", false),
        supabase
          .from("maintenance_tasks")
          .select(
            "*, assets(custom_name, category_l1_id), properties(address)"
          )
          .in("status", ["pending", "overdue"])
          .order("next_due_date", { ascending: true })
          .limit(10),
        supabase
          .from("service_records")
          .select(
            "*, assets(custom_name, property_id, properties(address))"
          )
          .order("service_date", { ascending: false })
          .limit(5),
        supabase
          .from("asset_lifecycle")
          .select("*")
          .lt("remaining_life_years", 2)
          .gte("remaining_life_years", 0)
          .order("remaining_life_years", { ascending: true })
          .limit(5),
      ]);

      const today = new Date().toISOString().split("T")[0];
      const overdueCount =
        tasks?.filter((t) => t.next_due_date < today).length ?? 0;
      const upcomingCount = (tasks?.length ?? 0) - overdueCount;

      setStats({
        properties: propertyCount ?? 0,
        assets: assetCount ?? 0,
        upcomingTasks: upcomingCount,
        overdueTasks: overdueCount,
      });
      setRecentServices(services ?? []);
      setEndOfLifeAssets(lifecycle ?? []);
      setUpcomingTasks(tasks ?? []);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    {
      title: "Properties",
      value: stats.properties,
      icon: Building2,
      color: "text-blue-600 bg-blue-50",
      href: "/properties",
    },
    {
      title: "Assets",
      value: stats.assets,
      icon: Package,
      color: "text-emerald-600 bg-emerald-50",
      href: "/assets",
    },
    {
      title: "Upcoming Tasks",
      value: stats.upcomingTasks,
      icon: CalendarClock,
      color: "text-amber-600 bg-amber-50",
      href: "/maintenance",
    },
    {
      title: "Overdue Tasks",
      value: stats.overdueTasks,
      icon: AlertTriangle,
      color: "text-red-600 bg-red-50",
      href: "/maintenance",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back
            {user?.user_metadata?.full_name
              ? `, ${user.user_metadata.full_name}`
              : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate("/properties/new")}>
            <Plus className="mr-1 size-4" />
            Property
          </Button>
          <Button size="sm" onClick={() => navigate("/assets/new")}>
            <Plus className="mr-1 size-4" />
            Asset
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card
            key={card.title}
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => navigate(card.href)}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </p>
                  <p className="mt-1 text-3xl font-bold">{card.value}</p>
                </div>
                <div className={`flex size-12 items-center justify-center rounded-lg ${card.color}`}>
                  <card.icon className="size-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Upcoming Maintenance</CardTitle>
              <CardDescription>Tasks due in the next 90 days</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/maintenance")}
            >
              View All
              <ArrowRight className="ml-1 size-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingTasks.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No upcoming maintenance tasks
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingTasks.slice(0, 5).map((task) => {
                  const today = new Date().toISOString().split("T")[0];
                  const isOverdue = task.next_due_date < today;
                  return (
                    <div
                      key={task.id}
                      className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/maintenance/${task.id}`)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {task.task_name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {task.properties?.address ||
                            task.assets?.custom_name ||
                            "Unknown"}
                        </p>
                      </div>
                      <Badge
                        variant={isOverdue ? "destructive" : "secondary"}
                        className="ml-2 shrink-0"
                      >
                        {isOverdue
                          ? "Overdue"
                          : new Date(
                              task.next_due_date
                            ).toLocaleDateString()}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Recent Service Activity</CardTitle>
              <CardDescription>Latest service records</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/service-records")}
            >
              View All
              <ArrowRight className="ml-1 size-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentServices.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No service records yet
              </p>
            ) : (
              <div className="space-y-3">
                {recentServices.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50 cursor-pointer"
                    onClick={() => navigate(`/service-records/${record.id}`)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                        <Wrench className="size-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {record.description?.substring(0, 50) || "Service Record"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {record.assets?.custom_name} &middot;{" "}
                          {record.service_type}
                        </p>
                      </div>
                    </div>
                    <div className="ml-2 shrink-0 text-right">
                      <p className="text-sm font-medium">
                        {record.total_cost
                          ? `$${Number(record.total_cost).toLocaleString()}`
                          : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(record.service_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {endOfLifeAssets.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">
                Assets Approaching End of Life
              </CardTitle>
              <CardDescription>
                Assets with less than 2 years of expected life remaining
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/assets")}
            >
              View All
              <ArrowRight className="ml-1 size-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {endOfLifeAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50 cursor-pointer"
                  onClick={() => navigate(`/assets/${asset.id}`)}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {asset.custom_name || asset.category_l3_name || asset.category_l1_name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {asset.property_address}
                      {asset.unit_number ? ` - ${asset.unit_number}` : ""}
                    </p>
                  </div>
                  <Badge variant="destructive" className="ml-2 shrink-0">
                    {asset.remaining_life_years != null
                      ? `${Math.round(asset.remaining_life_years)} yr${
                          Math.round(asset.remaining_life_years) !== 1 ? "s" : ""
                        } left`
                      : "Unknown"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
