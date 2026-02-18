import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import supabase from "@/utils/supabase";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Edit,
  Trash2,
  CheckCircle2,
} from "lucide-react";

export function MaintenanceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");

  useEffect(() => {
    fetchTask();
  }, [id]);

  async function fetchTask() {
    try {
      const { data } = await supabase
        .from("maintenance_tasks")
        .select(
          "*, assets(custom_name, properties(address), asset_category_l1(name), asset_category_l3(name)), properties(address), contractors(company_name, phone, email)"
        )
        .eq("id", id)
        .single();

      setTask(data);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async () => {
    try {
      await supabase.from("maintenance_tasks").delete().eq("id", id);
      navigate("/maintenance");
    } catch (err) {
      console.error("Error:", err);
    }
  };

  const handleComplete = async () => {
    try {
      await supabase
        .from("maintenance_tasks")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          last_completed_date: new Date().toISOString().split("T")[0],
          completion_notes: completionNotes || null,
        })
        .eq("id", id);
      setShowCompleteDialog(false);
      fetchTask();
    } catch (err) {
      console.error("Error:", err);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-foreground">Loading...</div>
    );
  }

  if (!task) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg font-medium">Task not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate("/maintenance")}
        >
          Back to Maintenance
        </Button>
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const isOverdue = task.status === "pending" && task.next_due_date < today;
  const displayStatus = isOverdue ? "overdue" : task.status;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/maintenance")}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {task.task_name}
              </h1>
              <Badge
                variant={
                  displayStatus === "overdue"
                    ? "destructive"
                    : displayStatus === "completed"
                      ? "default"
                      : "secondary"
                }
              >
                {displayStatus}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Due {new Date(task.next_due_date).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {task.status !== "completed" && (
            <Button
              size="sm"
              onClick={() => setShowCompleteDialog(true)}
            >
              <CheckCircle2 className="mr-1 size-4" />
              Complete
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/maintenance/${id}/edit`)}
          >
            <Edit className="mr-1 size-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="mr-1 size-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Due Date</p>
            <p className="text-lg font-semibold">
              {new Date(task.next_due_date).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Est. Cost</p>
            <p className="text-lg font-semibold">
              {task.estimated_cost
                ? `$${Number(task.estimated_cost).toLocaleString()}`
                : "N/A"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Est. Duration</p>
            <p className="text-lg font-semibold">
              {task.estimated_duration_minutes
                ? `${task.estimated_duration_minutes} min`
                : "N/A"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Task Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">
                  Linked To
                </dt>
                <dd className="text-sm font-medium">
                  {task.assets ? (
                    <span
                      className="cursor-pointer text-primary hover:underline"
                      onClick={() =>
                        navigate(`/assets/${task.asset_id}`)
                      }
                    >
                      {task.assets.custom_name ||
                        task.assets.asset_category_l3?.name}
                    </span>
                  ) : (
                    task.properties?.address || "Unknown"
                  )}
                </dd>
              </div>
              {task.assets?.properties?.address && (
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">
                    Property
                  </dt>
                  <dd className="text-sm">
                    {task.assets.properties.address}
                  </dd>
                </div>
              )}
              {task.contractors && (
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">
                    Contractor
                  </dt>
                  <dd className="text-sm font-medium">
                    {task.contractors.company_name}
                  </dd>
                </div>
              )}
              {task.last_completed_date && (
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">
                    Last Completed
                  </dt>
                  <dd className="text-sm">
                    {new Date(
                      task.last_completed_date
                    ).toLocaleDateString()}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {task.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">
                  {task.description}
                </p>
              </CardContent>
            </Card>
          )}
          {task.instructions && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">
                  {task.instructions}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {task.completion_notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Completion Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">
              {task.completion_notes}
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={showCompleteDialog}
        onOpenChange={setShowCompleteDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Task</DialogTitle>
            <DialogDescription>
              Mark this task as complete. You can optionally add notes
              about what was done.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="completionNotes">Notes (optional)</Label>
            <Textarea
              id="completionNotes"
              placeholder="Any notes about the completed work..."
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCompleteDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleComplete}>
              <CheckCircle2 className="mr-1 size-4" />
              Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this maintenance task? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
