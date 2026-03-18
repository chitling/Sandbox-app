import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import supabase from "@/utils/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate } from "@/utils/dates";
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
  Repeat,
  CalendarClock,
  FileText,
  ExternalLink,
} from "lucide-react";

const frequencyLabels = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  "semi-annual": "Semi-Annual",
  annual: "Annual",
  custom: "Custom",
};

function computeNextDueDate(task, completionDate) {
  const baseDate =
    task.recurrence_mode === "from_completion"
      ? new Date(completionDate)
      : new Date(task.next_due_date);

  if (task.frequency === "custom" && task.custom_interval_days) {
    baseDate.setDate(baseDate.getDate() + task.custom_interval_days);
  } else {
    const monthsMap = {
      monthly: 1,
      quarterly: 3,
      "semi-annual": 6,
      annual: 12,
    };
    const months = monthsMap[task.frequency] || 1;
    baseDate.setMonth(baseDate.getMonth() + months);
  }

  return baseDate.toISOString().split("T")[0];
}

export function MaintenanceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");
  const [createdRecordId, setCreatedRecordId] = useState(null);

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

  async function createServiceRecord(task, notes) {
    const today = new Date().toISOString().split("T")[0];

    const descriptionParts = [];
    if (task.task_name) descriptionParts.push(task.task_name);
    if (task.description) descriptionParts.push(task.description);

    const notesParts = [];
    if (notes) notesParts.push(notes);
    if (task.instructions) notesParts.push(`Instructions: ${task.instructions}`);

    const payload = {
      user_id: user.id,
      asset_id: task.asset_id || null,
      property_id: task.property_id || null,
      contractor_id: task.contractor_id || null,
      maintenance_task_id: task.id,
      service_date: today,
      service_type: task.service_type || "Preventative Maintenance",
      description: descriptionParts.join(" — ") || task.task_name,
      total_cost: task.estimated_cost ? parseFloat(task.estimated_cost) : null,
      notes: notesParts.join("\n\n") || null,
    };

    const { data, error } = await supabase
      .from("service_records")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  const handleComplete = async () => {
    const today = new Date().toISOString().split("T")[0];

    try {
      const record = await createServiceRecord(task, completionNotes);

      if (task.is_recurring) {
        const nextDue = computeNextDueDate(task, today);
        await supabase
          .from("maintenance_tasks")
          .update({
            last_completed_date: today,
            completion_notes: completionNotes || null,
            next_due_date: nextDue,
            status: "pending",
          })
          .eq("id", id);
      } else {
        await supabase
          .from("maintenance_tasks")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            last_completed_date: today,
            completion_notes: completionNotes || null,
          })
          .eq("id", id);
      }

      setCreatedRecordId(record.id);
      setShowCompleteDialog(false);
      setCompletionNotes("");
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

  const nextDuePreview = task.is_recurring
    ? computeNextDueDate(task, today)
    : null;

  return (
    <div className="space-y-6">
      {createdRecordId && (
        <div className="flex items-center justify-between rounded-md border border-green-200 bg-green-50 px-4 py-3 dark:border-green-900 dark:bg-green-950">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-green-600" />
            <p className="text-sm text-green-800 dark:text-green-200">
              Service record created successfully.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-green-700 hover:text-green-900 dark:text-green-300"
            onClick={() => navigate(`/service-records/${createdRecordId}`)}
          >
            View Record
            <ExternalLink className="size-3" />
          </Button>
        </div>
      )}

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
              {task.service_type && (
                <Badge variant="secondary">{task.service_type}</Badge>
              )}
              {task.is_recurring && (
                <Badge variant="outline" className="gap-1">
                  <Repeat className="size-3" />
                  {frequencyLabels[task.frequency] || task.frequency}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              Due {formatDate(task.next_due_date)}
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
              {formatDate(task.next_due_date)}
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
                    {formatDate(task.last_completed_date)}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {task.is_recurring && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Repeat className="size-4" />
                  Recurrence Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-sm text-muted-foreground">
                      Frequency
                    </dt>
                    <dd className="text-sm font-medium">
                      {task.frequency === "custom"
                        ? `Every ${task.custom_interval_days} days`
                        : frequencyLabels[task.frequency] || task.frequency}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-muted-foreground">
                      Scheduling Mode
                    </dt>
                    <dd className="flex items-center gap-1.5 text-sm font-medium">
                      {task.recurrence_mode === "fixed" ? (
                        <>
                          <CalendarClock className="size-3.5 text-muted-foreground" />
                          Fixed Schedule
                        </>
                      ) : (
                        <>
                          <Repeat className="size-3.5 text-muted-foreground" />
                          From Completion
                        </>
                      )}
                    </dd>
                  </div>
                  {nextDuePreview && task.status !== "completed" && (
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">
                        Next Due After Completion
                      </dt>
                      <dd className="text-sm font-medium">
                        {formatDate(nextDuePreview)}
                      </dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          )}

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
            <CardTitle className="text-base">
              {task.is_recurring
                ? "Last Completion Notes"
                : "Completion Notes"}
            </CardTitle>
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
              {task.is_recurring ? (
                <>
                  Mark this task as complete. Since this is a recurring task
                  ({frequencyLabels[task.frequency] || task.frequency}), the
                  next due date will be automatically set to{" "}
                  <strong>
                    {nextDuePreview
                      ? formatDate(nextDuePreview)
                      : ""}
                  </strong>
                  {task.recurrence_mode === "fixed"
                    ? " (based on the current schedule)."
                    : " (based on today's completion date)."}
                </>
              ) : (
                "Mark this task as complete."
              )}{" "}
              A service record will be created automatically.
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
              {task.is_recurring ? "Complete & Reschedule" : "Complete"}
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
