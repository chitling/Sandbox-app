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

const serviceTypes = [
  "Preventative Maintenance",
  "Repair",
  "Replacement",
  "Inspection",
];

export function ServiceRecordFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const preselectedAssetId = searchParams.get("asset_id");
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError] = useState("");

  const [assets, setAssets] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [vendors, setVendors] = useState([]);

  const [form, setForm] = useState({
    asset_id: preselectedAssetId || "",
    contractor_id: "",
    vendor_id: "",
    service_date: new Date().toISOString().split("T")[0],
    service_type: "",
    description: "",
    labor_cost: "",
    parts_cost: "",
    total_cost: "",
    is_warranty_work: false,
    repair_warranty_expiration: "",
    notes: "",
  });

  useEffect(() => {
    fetchLookups();
    if (isEdit) fetchRecord();
  }, [id]);

  async function fetchLookups() {
    const [{ data: assetsData }, { data: contData }, { data: vendData }] =
      await Promise.all([
        supabase
          .from("assets")
          .select("id, custom_name, properties(address), asset_category_l3(name)")
          .eq("is_archived", false)
          .order("custom_name"),
        supabase
          .from("contractors")
          .select("id, company_name")
          .order("company_name"),
        supabase
          .from("vendors")
          .select("id, company_name")
          .order("company_name"),
      ]);
    setAssets(assetsData || []);
    setContractors(contData || []);
    setVendors(vendData || []);
  }

  async function fetchRecord() {
    try {
      const { data, error } = await supabase
        .from("service_records")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setForm({
        asset_id: data.asset_id || "",
        contractor_id: data.contractor_id || "",
        vendor_id: data.vendor_id || "",
        service_date: data.service_date || "",
        service_type: data.service_type || "",
        description: data.description || "",
        labor_cost: data.labor_cost || "",
        parts_cost: data.parts_cost || "",
        total_cost: data.total_cost || "",
        is_warranty_work: data.is_warranty_work || false,
        repair_warranty_expiration: data.repair_warranty_expiration || "",
        notes: data.notes || "",
      });
    } catch (err) {
      console.error("Error:", err);
      setError("Record not found");
    } finally {
      setFetching(false);
    }
  }

  const handleChange = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "labor_cost" || field === "parts_cost") {
        const labor = parseFloat(field === "labor_cost" ? value : prev.labor_cost) || 0;
        const parts = parseFloat(field === "parts_cost" ? value : prev.parts_cost) || 0;
        next.total_cost = (labor + parts).toFixed(2);
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        user_id: user.id,
        asset_id: form.asset_id || null,
        contractor_id: form.contractor_id || null,
        vendor_id: form.vendor_id || null,
        service_date: form.service_date,
        service_type: form.service_type,
        description: form.description,
        labor_cost: form.labor_cost ? parseFloat(form.labor_cost) : null,
        parts_cost: form.parts_cost ? parseFloat(form.parts_cost) : null,
        total_cost: form.total_cost ? parseFloat(form.total_cost) : null,
        is_warranty_work: form.is_warranty_work,
        repair_warranty_expiration:
          form.repair_warranty_expiration || null,
        notes: form.notes || null,
      };

      if (isEdit) {
        const { error } = await supabase
          .from("service_records")
          .update(payload)
          .eq("id", id);
        if (error) throw error;
        navigate(`/service-records/${id}`);
      } else {
        const { data, error } = await supabase
          .from("service_records")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        navigate(`/service-records/${data.id}`);
      }
    } catch (err) {
      setError(err.message || "Failed to save record");
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
            {isEdit ? "Edit Service Record" : "Add Service Record"}
          </h1>
          <p className="text-muted-foreground">
            {isEdit ? "Update service details" : "Log maintenance or repair work"}
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
            <CardTitle>Service Details</CardTitle>
            <CardDescription>What work was performed?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label>
                  Service Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.service_type}
                  onValueChange={(v) => handleChange("service_type", v)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service_date">
                Service Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="service_date"
                type="date"
                value={form.service_date}
                onChange={(e) => handleChange("service_date", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Describe the work performed..."
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                rows={3}
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contractor & Vendor</CardTitle>
            <CardDescription>Who did the work?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contractor</Label>
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
              <div className="space-y-2">
                <Label>Parts Vendor</Label>
                <Select
                  value={form.vendor_id}
                  onValueChange={(v) => handleChange("vendor_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Costs</CardTitle>
            <CardDescription>
              Break down labor and parts costs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="labor_cost">Labor Cost ($)</Label>
                <Input
                  id="labor_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.labor_cost}
                  onChange={(e) =>
                    handleChange("labor_cost", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parts_cost">Parts Cost ($)</Label>
                <Input
                  id="parts_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.parts_cost}
                  onChange={(e) =>
                    handleChange("parts_cost", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="total_cost">Total Cost ($)</Label>
                <Input
                  id="total_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.total_cost}
                  onChange={(e) =>
                    handleChange("total_cost", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_warranty_work"
                checked={form.is_warranty_work}
                onChange={(e) =>
                  handleChange("is_warranty_work", e.target.checked)
                }
                className="size-4 rounded border"
              />
              <Label htmlFor="is_warranty_work">
                This is warranty work
              </Label>
            </div>

            {form.is_warranty_work && (
              <div className="space-y-2">
                <Label htmlFor="repair_warranty_expiration">
                  Repair Warranty Expiration
                </Label>
                <Input
                  id="repair_warranty_expiration"
                  type="date"
                  value={form.repair_warranty_expiration}
                  onChange={(e) =>
                    handleChange(
                      "repair_warranty_expiration",
                      e.target.value
                    )
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Any additional notes..."
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              rows={3}
            />
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
            {loading
              ? "Saving..."
              : isEdit
                ? "Update Record"
                : "Add Record"}
          </Button>
        </div>
      </form>
    </div>
  );
}
