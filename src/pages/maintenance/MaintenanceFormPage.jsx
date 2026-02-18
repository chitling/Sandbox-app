import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";

export function MaintenanceFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const preselectedAssetId = searchParams.get("asset_id");
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError] = useState("");
  const [linkType, setLinkType] = useState(
    preselectedAssetId ? "asset" : "asset"
  );

  const [assets, setAssets] = useState([]);
  const [properties, setProperties] = useState([]);
  const [contractors, setContractors] = useState([]);

  const [form, setForm] = useState({
    task_name: "",
    description: "",
    instructions: "",
    asset_id: preselectedAssetId || "",
    property_id: "",
    contractor_id: "",
    next_due_date: "",
    estimated_duration_minutes: "",
    estimated_cost: "",
  });

  useEffect(() => {
    fetchLookups();
    if (isEdit) fetchTask();
  }, [id]);

  async function fetchLookups() {
    const [{ data: assetsData }, { data: propsData }, { data: contData }] =
      await Promise.all([
        supabase
          .from("assets")
          .select("id, custom_name, properties(address), asset_category_l3(name)")
          .eq("is_archived", false)
          .order("custom_name"),
        supabase
          .from("properties")
          .select("id, address")
          .eq("is_archived", false)
          .order("address"),
        supabase
          .from("contractors")
          .select("id, company_name")
          .order("company_name"),
      ]);
    setAssets(assetsData || []);
    setProperties(propsData || []);
    setContractors(contData || []);
  }

  async function fetchTask() {
    try {
      const { data, error } = await supabase
        .from("maintenance_tasks")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setForm({
        task_name: data.task_name || "",
        description: data.description || "",
        instructions: data.instructions || "",
        asset_id: data.asset_id || "",
        property_id: data.property_id || "",
        contractor_id: data.contractor_id || "",
        next_due_date: data.next_due_date || "",
        estimated_duration_minutes: data.estimated_duration_minutes || "",
        estimated_cost: data.estimated_cost || "",
      });
      setLinkType(data.asset_id ? "asset" : "property");
    } catch (err) {
      console.error("Error:", err);
      setError("Task not found");
    } finally {
      setFetching(false);
    }
  }

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        user_id: user.id,
        task_name: form.task_name,
        description: form.description || null,
        instructions: form.instructions || null,
        asset_id: linkType === "asset" ? form.asset_id || null : null,
        property_id:
          linkType === "property" ? form.property_id || null : null,
        contractor_id: form.contractor_id || null,
        next_due_date: form.next_due_date,
        estimated_duration_minutes: form.estimated_duration_minutes
          ? parseInt(form.estimated_duration_minutes)
          : null,
        estimated_cost: form.estimated_cost
          ? parseFloat(form.estimated_cost)
          : null,
        status: "pending",
      };

      if (isEdit) {
        const { error } = await supabase
          .from("maintenance_tasks")
          .update(payload)
          .eq("id", id);
        if (error) throw error;
        navigate(`/maintenance/${id}`);
      } else {
        const { data, error } = await supabase
          .from("maintenance_tasks")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        navigate(`/maintenance/${data.id}`);
      }
    } catch (err) {
      setError(err.message || "Failed to save task");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="py-12 text-center text-muted-foreground">Loading...</div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? "Edit Maintenance Task" : "Add Maintenance Task"}
          </h1>
          <p className="text-muted-foreground">
            {isEdit
              ? "Update task details"
              : "Schedule a new maintenance task"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Task Details</CardTitle>
            <CardDescription>What needs to be done?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task_name">
                Task Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="task_name"
                placeholder='e.g., "HVAC filter change", "Water heater flush"'
                value={form.task_name}
                onChange={(e) => handleChange("task_name", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the task..."
                value={form.description}
                onChange={(e) =>
                  handleChange("description", e.target.value)
                }
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                placeholder="Step-by-step instructions..."
                value={form.instructions}
                onChange={(e) =>
                  handleChange("instructions", e.target.value)
                }
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assignment</CardTitle>
            <CardDescription>
              Link to a specific asset or property
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button
                type="button"
                variant={linkType === "asset" ? "default" : "outline"}
                size="sm"
                onClick={() => setLinkType("asset")}
              >
                Link to Asset
              </Button>
              <Button
                type="button"
                variant={linkType === "property" ? "default" : "outline"}
                size="sm"
                onClick={() => setLinkType("property")}
              >
                Link to Property
              </Button>
            </div>

            {linkType === "asset" ? (
              <div className="space-y-2">
                <Label>
                  Asset <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.asset_id}
                  onValueChange={(v) => handleChange("asset_id", v)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select asset" />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.custom_name ||
                          a.asset_category_l3?.name ||
                          "Unnamed"}{" "}
                        - {a.properties?.address || ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>
                  Property <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.property_id}
                  onValueChange={(v) => handleChange("property_id", v)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Preferred Contractor</Label>
              <Select
                value={form.contractor_id}
                onValueChange={(v) => handleChange("contractor_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contractor" />
                </SelectTrigger>
                <SelectContent>
                  {contractors.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule & Estimates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="next_due_date">
                Due Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="next_due_date"
                type="date"
                value={form.next_due_date}
                onChange={(e) =>
                  handleChange("next_due_date", e.target.value)
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimated_duration_minutes">
                  Est. Duration (minutes)
                </Label>
                <Input
                  id="estimated_duration_minutes"
                  type="number"
                  min="0"
                  placeholder="60"
                  value={form.estimated_duration_minutes}
                  onChange={(e) =>
                    handleChange(
                      "estimated_duration_minutes",
                      e.target.value
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimated_cost">Est. Cost ($)</Label>
                <Input
                  id="estimated_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.estimated_cost}
                  onChange={(e) =>
                    handleChange("estimated_cost", e.target.value)
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="mr-1 size-4" />
            {loading ? "Saving..." : isEdit ? "Update Task" : "Add Task"}
          </Button>
        </div>
      </form>
    </div>
  );
}
