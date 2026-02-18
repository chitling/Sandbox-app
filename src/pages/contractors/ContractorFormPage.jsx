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
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, X } from "lucide-react";

const commonServices = [
  "HVAC",
  "Plumbing",
  "Electrical",
  "Roofing",
  "Painting",
  "General Handyman",
  "Appliance Repair",
  "Landscaping",
  "Flooring",
  "Carpentry",
  "Pest Control",
  "Cleaning",
];

export function ContractorFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    phone: "",
    email: "",
    website: "",
    address: "",
    services_offered: [],
    license_number: "",
    insurance_expiration: "",
    notes: "",
    rating: "",
  });

  useEffect(() => {
    if (isEdit) fetchContractor();
  }, [id]);

  async function fetchContractor() {
    try {
      const { data, error } = await supabase
        .from("contractors")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setForm({
        company_name: data.company_name || "",
        contact_name: data.contact_name || "",
        phone: data.phone || "",
        email: data.email || "",
        website: data.website || "",
        address: data.address || "",
        services_offered: data.services_offered || [],
        license_number: data.license_number || "",
        insurance_expiration: data.insurance_expiration || "",
        notes: data.notes || "",
        rating: data.rating ? String(data.rating) : "",
      });
    } catch (err) {
      console.error("Error:", err);
      setError("Contractor not found");
    } finally {
      setFetching(false);
    }
  }

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleService = (service) => {
    setForm((prev) => ({
      ...prev,
      services_offered: prev.services_offered.includes(service)
        ? prev.services_offered.filter((s) => s !== service)
        : [...prev.services_offered, service],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        user_id: user.id,
        company_name: form.company_name,
        contact_name: form.contact_name || null,
        phone: form.phone || null,
        email: form.email || null,
        website: form.website || null,
        address: form.address || null,
        services_offered:
          form.services_offered.length > 0
            ? form.services_offered
            : null,
        license_number: form.license_number || null,
        insurance_expiration: form.insurance_expiration || null,
        notes: form.notes || null,
        rating: form.rating ? parseInt(form.rating) : null,
      };

      if (isEdit) {
        const { error } = await supabase
          .from("contractors")
          .update(payload)
          .eq("id", id);
        if (error) throw error;
        navigate(`/contractors/${id}`);
      } else {
        const { data, error } = await supabase
          .from("contractors")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        navigate(`/contractors/${data.id}`);
      }
    } catch (err) {
      setError(err.message || "Failed to save contractor");
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
            {isEdit ? "Edit Contractor" : "Add Contractor"}
          </h1>
          <p className="text-muted-foreground">
            {isEdit
              ? "Update contractor details"
              : "Add a new contractor to your directory"}
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
            <CardTitle>Company Info</CardTitle>
            <CardDescription>
              Basic contractor information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">
                  Company Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="company_name"
                  placeholder="ABC Plumbing"
                  value={form.company_name}
                  onChange={(e) =>
                    handleChange("company_name", e.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_name">Contact Name</Label>
                <Input
                  id="contact_name"
                  placeholder="John Smith"
                  value={form.contact_name}
                  onChange={(e) =>
                    handleChange("contact_name", e.target.value)
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="info@abcplumbing.com"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  placeholder="https://abcplumbing.com"
                  value={form.website}
                  onChange={(e) => handleChange("website", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="123 Trade St"
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Services Offered</CardTitle>
            <CardDescription>
              Select all services this contractor provides
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {commonServices.map((service) => {
                const selected = form.services_offered.includes(service);
                return (
                  <Badge
                    key={service}
                    variant={selected ? "default" : "outline"}
                    className="cursor-pointer select-none"
                    onClick={() => toggleService(service)}
                  >
                    {service}
                    {selected && <X className="ml-1 size-3" />}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>License & Insurance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="license_number">License Number</Label>
                <Input
                  id="license_number"
                  value={form.license_number}
                  onChange={(e) =>
                    handleChange("license_number", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="insurance_expiration">
                  Insurance Expiration
                </Label>
                <Input
                  id="insurance_expiration"
                  type="date"
                  value={form.insurance_expiration}
                  onChange={(e) =>
                    handleChange("insurance_expiration", e.target.value)
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rating">Rating (1-5)</Label>
              <Input
                id="rating"
                type="number"
                min="1"
                max="5"
                value={form.rating}
                onChange={(e) => handleChange("rating", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Any additional notes about this contractor..."
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
                ? "Update Contractor"
                : "Add Contractor"}
          </Button>
        </div>
      </form>
    </div>
  );
}
