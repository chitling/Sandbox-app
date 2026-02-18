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

export function AssetFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const preselectedPropertyId = searchParams.get("property_id");
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError] = useState("");

  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [categoriesL1, setCategoriesL1] = useState([]);
  const [categoriesL2, setCategoriesL2] = useState([]);
  const [categoriesL3, setCategoriesL3] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [vendors, setVendors] = useState([]);

  const [form, setForm] = useState({
    property_id: preselectedPropertyId || "",
    unit_id: "",
    category_l1_id: "",
    category_l2_id: "",
    category_l3_id: "",
    custom_name: "",
    location: "",
    manufacturer: "",
    model_number: "",
    serial_number: "",
    install_date: "",
    purchase_cost: "",
    vendor_id: "",
    installer_id: "",
    parts_warranty_expiration: "",
    labor_warranty_expiration: "",
    expected_lifespan_years: "",
    notes: "",
  });

  useEffect(() => {
    fetchLookups();
    if (isEdit) fetchAsset();
  }, [id]);

  useEffect(() => {
    if (form.property_id) fetchUnits(form.property_id);
  }, [form.property_id]);

  useEffect(() => {
    if (form.category_l1_id) fetchL2(form.category_l1_id);
  }, [form.category_l1_id]);

  useEffect(() => {
    if (form.category_l2_id) fetchL3(form.category_l2_id);
  }, [form.category_l2_id]);

  async function fetchLookups() {
    const [{ data: props }, { data: l1 }, { data: cont }, { data: vend }] =
      await Promise.all([
        supabase
          .from("properties")
          .select("id, address")
          .eq("is_archived", false)
          .order("address"),
        supabase.from("asset_category_l1").select("*").order("name"),
        supabase.from("contractors").select("id, company_name").order("company_name"),
        supabase.from("vendors").select("id, company_name").order("company_name"),
      ]);
    setProperties(props || []);
    setCategoriesL1(l1 || []);
    setContractors(cont || []);
    setVendors(vend || []);
  }

  async function fetchUnits(propertyId) {
    const { data } = await supabase
      .from("units")
      .select("id, unit_number")
      .eq("property_id", propertyId)
      .order("unit_number");
    setUnits(data || []);
  }

  async function fetchL2(l1Id) {
    const { data } = await supabase
      .from("asset_category_l2")
      .select("*")
      .eq("l1_id", parseInt(l1Id))
      .order("name");
    setCategoriesL2(data || []);
    setCategoriesL3([]);
  }

  async function fetchL3(l2Id) {
    const { data } = await supabase
      .from("asset_category_l3")
      .select("*")
      .eq("l2_id", parseInt(l2Id))
      .order("name");
    setCategoriesL3(data || []);
  }

  async function fetchAsset() {
    try {
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      setForm({
        property_id: data.property_id || "",
        unit_id: data.unit_id || "",
        category_l1_id: data.category_l1_id ? String(data.category_l1_id) : "",
        category_l2_id: data.category_l2_id ? String(data.category_l2_id) : "",
        category_l3_id: data.category_l3_id ? String(data.category_l3_id) : "",
        custom_name: data.custom_name || "",
        location: data.location || "",
        manufacturer: data.manufacturer || "",
        model_number: data.model_number || "",
        serial_number: data.serial_number || "",
        install_date: data.install_date || "",
        purchase_cost: data.purchase_cost || "",
        vendor_id: data.vendor_id || "",
        installer_id: data.installer_id || "",
        parts_warranty_expiration: data.parts_warranty_expiration || "",
        labor_warranty_expiration: data.labor_warranty_expiration || "",
        expected_lifespan_years: data.expected_lifespan_years || "",
        notes: data.notes || "",
      });

      if (data.category_l1_id) await fetchL2(data.category_l1_id);
      if (data.category_l2_id) await fetchL3(data.category_l2_id);
    } catch (err) {
      console.error("Error:", err);
      setError("Asset not found");
    } finally {
      setFetching(false);
    }
  }

  const handleChange = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "category_l1_id") {
        next.category_l2_id = "";
        next.category_l3_id = "";
      }
      if (field === "category_l2_id") {
        next.category_l3_id = "";
      }
      if (field === "category_l3_id" && value) {
        const l3 = categoriesL3.find((c) => String(c.id) === value);
        if (l3?.default_lifespan_years && !next.expected_lifespan_years) {
          next.expected_lifespan_years = String(l3.default_lifespan_years);
        }
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
        property_id: form.property_id || null,
        unit_id: form.unit_id || null,
        category_l1_id: form.category_l1_id
          ? parseInt(form.category_l1_id)
          : null,
        category_l2_id: form.category_l2_id
          ? parseInt(form.category_l2_id)
          : null,
        category_l3_id: form.category_l3_id
          ? parseInt(form.category_l3_id)
          : null,
        custom_name: form.custom_name || null,
        location: form.location || "Not specified",
        manufacturer: form.manufacturer || null,
        model_number: form.model_number || null,
        serial_number: form.serial_number || null,
        install_date: form.install_date || null,
        purchase_cost: form.purchase_cost
          ? parseFloat(form.purchase_cost)
          : null,
        vendor_id: form.vendor_id || null,
        installer_id: form.installer_id || null,
        parts_warranty_expiration: form.parts_warranty_expiration || null,
        labor_warranty_expiration: form.labor_warranty_expiration || null,
        expected_lifespan_years: form.expected_lifespan_years
          ? parseInt(form.expected_lifespan_years)
          : null,
        notes: form.notes || null,
      };

      if (isEdit) {
        const { error } = await supabase
          .from("assets")
          .update(payload)
          .eq("id", id);
        if (error) throw error;
        navigate(`/assets/${id}`);
      } else {
        const { data, error } = await supabase
          .from("assets")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        navigate(`/assets/${data.id}`);
      }
    } catch (err) {
      setError(err.message || "Failed to save asset");
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
            {isEdit ? "Edit Asset" : "Add Asset"}
          </h1>
          <p className="text-muted-foreground">
            {isEdit
              ? "Update asset information"
              : "Track a new piece of equipment"}
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
            <CardTitle>Location</CardTitle>
            <CardDescription>
              Where is this asset installed?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select
                  value={form.unit_id}
                  onValueChange={(v) => handleChange("unit_id", v)}
                  disabled={units.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        units.length === 0 ? "No units" : "Select unit"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.unit_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location in Property</Label>
              <Input
                id="location"
                placeholder="e.g., Basement, Kitchen, Attic"
                value={form.location}
                onChange={(e) => handleChange("location", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category</CardTitle>
            <CardDescription>
              What type of equipment is this?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>
                Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.category_l1_id}
                onValueChange={(v) => handleChange("category_l1_id", v)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesL1.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {categoriesL2.length > 0 && (
              <div className="space-y-2">
                <Label>Sub-category</Label>
                <Select
                  value={form.category_l2_id}
                  onValueChange={(v) => handleChange("category_l2_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sub-category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriesL2.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {categoriesL3.length > 0 && (
              <div className="space-y-2">
                <Label>Specific Type</Label>
                <Select
                  value={form.category_l3_id}
                  onValueChange={(v) => handleChange("category_l3_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select specific type" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriesL3.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                        {c.default_lifespan_years
                          ? ` (${c.default_lifespan_years} yr lifespan)`
                          : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="custom_name">Custom Name</Label>
              <Input
                id="custom_name"
                placeholder='e.g., "Master Bedroom AC", "Kitchen Fridge"'
                value={form.custom_name}
                onChange={(e) => handleChange("custom_name", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>
              Manufacturer and model information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input
                  id="manufacturer"
                  placeholder="e.g., Carrier, GE"
                  value={form.manufacturer}
                  onChange={(e) =>
                    handleChange("manufacturer", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model_number">Model Number</Label>
                <Input
                  id="model_number"
                  value={form.model_number}
                  onChange={(e) =>
                    handleChange("model_number", e.target.value)
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="serial_number">Serial Number</Label>
                <Input
                  id="serial_number"
                  value={form.serial_number}
                  onChange={(e) =>
                    handleChange("serial_number", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="install_date">
                  Install Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="install_date"
                  type="date"
                  value={form.install_date}
                  onChange={(e) =>
                    handleChange("install_date", e.target.value)
                  }
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchase_cost">Purchase Cost ($)</Label>
                <Input
                  id="purchase_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.purchase_cost}
                  onChange={(e) =>
                    handleChange("purchase_cost", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expected_lifespan_years">
                  Expected Lifespan (years)
                </Label>
                <Input
                  id="expected_lifespan_years"
                  type="number"
                  min="0"
                  value={form.expected_lifespan_years}
                  onChange={(e) =>
                    handleChange("expected_lifespan_years", e.target.value)
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vendor & Installer</CardTitle>
            <CardDescription>
              Where was it purchased and who installed it?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vendor</Label>
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
              <div className="space-y-2">
                <Label>Installer</Label>
                <Select
                  value={form.installer_id}
                  onValueChange={(v) => handleChange("installer_id", v)}
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Warranty</CardTitle>
            <CardDescription>Warranty expiration dates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="parts_warranty_expiration">
                  Parts Warranty Expiration
                </Label>
                <Input
                  id="parts_warranty_expiration"
                  type="date"
                  value={form.parts_warranty_expiration}
                  onChange={(e) =>
                    handleChange(
                      "parts_warranty_expiration",
                      e.target.value
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="labor_warranty_expiration">
                  Labor Warranty Expiration
                </Label>
                <Input
                  id="labor_warranty_expiration"
                  type="date"
                  value={form.labor_warranty_expiration}
                  onChange={(e) =>
                    handleChange(
                      "labor_warranty_expiration",
                      e.target.value
                    )
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Any additional notes about this asset..."
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
            {loading ? "Saving..." : isEdit ? "Update Asset" : "Add Asset"}
          </Button>
        </div>
      </form>
    </div>
  );
}
