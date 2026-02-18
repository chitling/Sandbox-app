import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import supabase from "@/utils/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, CalendarClock, CheckCircle2 } from "lucide-react";

export function MaintenancePage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    try {
      const { data, error } = await supabase
        .from("maintenance_tasks")
        .select(
          "*, assets(custom_name, asset_category_l1(name)), properties(address), contractors(company_name)"
        )
        .order("next_due_date", { ascending: true });

      if (error) throw error;

      const today = new Date().toISOString().split("T")[0];
      const withStatus = (data || []).map((task) => ({
        ...task,
        computed_status:
          task.status === "completed"
            ? "completed"
            : task.next_due_date < today
              ? "overdue"
              : task.status,
      }));

      setTasks(withStatus);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleComplete = async (e, taskId) => {
    e.stopPropagation();
    try {
      await supabase
        .from("maintenance_tasks")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          last_completed_date: new Date().toISOString().split("T")[0],
        })
        .eq("id", taskId);
      fetchTasks();
    } catch (err) {
      console.error("Error:", err);
    }
  };

  const filtered = tasks.filter((t) => {
    const matchesSearch =
      !search ||
      t.task_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.assets?.custom_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.properties?.address?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" &&
        (t.computed_status === "pending" ||
          t.computed_status === "overdue")) ||
      t.computed_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Maintenance Tasks
          </h1>
          <p className="text-muted-foreground">
            Schedule and track maintenance work
          </p>
        </div>
        <Button onClick={() => navigate("/maintenance/new")}>
          <Plus className="mr-1 size-4" />
          Add Task
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-12">
              <CalendarClock className="mb-4 size-12 text-muted-foreground/50" />
              <p className="text-lg font-medium">No tasks found</p>
              <p className="text-sm text-muted-foreground">
                {tasks.length === 0
                  ? "Create your first maintenance task"
                  : "Try adjusting your search or filters"}
              </p>
              {tasks.length === 0 && (
                <Button
                  className="mt-4"
                  onClick={() => navigate("/maintenance/new")}
                >
                  <Plus className="mr-1 size-4" />
                  Add Task
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Asset / Property</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Contractor</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((task) => (
                    <TableRow
                      key={task.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/maintenance/${task.id}`)}
                    >
                      <TableCell>
                        <p className="font-medium">{task.task_name}</p>
                        {task.is_recurring && (
                          <p className="text-xs text-muted-foreground">
                            Recurring ({task.frequency})
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">
                          {task.assets?.custom_name ||
                            task.properties?.address ||
                            "Unknown"}
                        </p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {new Date(
                          task.next_due_date
                        ).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            task.computed_status === "overdue"
                              ? "destructive"
                              : task.computed_status === "completed"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {task.computed_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {task.contractors?.company_name || "-"}
                      </TableCell>
                      <TableCell>
                        {task.computed_status !== "completed" && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            title="Mark complete"
                            onClick={(e) => handleComplete(e, task.id)}
                          >
                            <CheckCircle2 className="size-4 text-green-600" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
