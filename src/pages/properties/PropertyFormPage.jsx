import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
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

const propertyTypes = [
  "Single-Family",
  "Duplex",
  "Triplex",
  "Fourplex",
  "Apartment",
  "Condo",
  "Townhouse",
  "Commercial",
  "Other",
];

export function PropertyFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    address: "",
    city: "",
    state: "",
    zip_code: "",
    property_type: "",
    number_of_units: 1,
    notes: "",
  });

  useEffect(() => {
    if (isEdit) fetchProperty();
  }, [id]);

  async function fetchProperty() {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setForm({
        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        zip_code: data.zip_code || "",
        property_type: data.property_type || "",
        number_of_units: data.number_of_units || 1,
        notes: data.notes || "",
      });
    } catch (err) {
      console.error("Error fetching property:", err);
      setError("Property not found");
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
        ...form,
        number_of_units: parseInt(form.number_of_units) || 1,
        user_id: user.id,
      };

      if (isEdit) {
        const { error } = await supabase
          .from("properties")
          .update(payload)
          .eq("id", id);
        if (error) throw error;
        navigate(`/properties/${id}`);
      } else {
        const { data, error } = await supabase
          .from("properties")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        navigate(`/properties/${data.id}`);
      }
    } catch (err) {
      setError(err.message || "Failed to save property");
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
            {isEdit ? "Edit Property" : "Add Property"}
          </h1>
          <p className="text-muted-foreground">
            {isEdit
              ? "Update property information"
              : "Add a new rental property"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Property Details</CardTitle>
          <CardDescription>
            Basic information about the property
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="address">
                Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="address"
                placeholder="123 Main St"
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Springfield"
                  value={form.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  placeholder="IL"
                  value={form.state}
                  onChange={(e) => handleChange("state", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip_code">ZIP Code</Label>
                <Input
                  id="zip_code"
                  placeholder="62704"
                  value={form.zip_code}
                  onChange={(e) => handleChange("zip_code", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Property Type</Label>
                <Select
                  value={form.property_type}
                  onValueChange={(v) => handleChange("property_type", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {propertyTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="number_of_units">Number of Units</Label>
                <Input
                  id="number_of_units"
                  type="number"
                  min="1"
                  value={form.number_of_units}
                  onChange={(e) =>
                    handleChange("number_of_units", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes about this property..."
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
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
                    ? "Update Property"
                    : "Add Property"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
