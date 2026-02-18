import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import supabase from "@/utils/supabase";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
import { Plus, Search, Building2, MapPin } from "lucide-react";

export function PropertiesPage() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchProperties();
  }, []);

  async function fetchProperties() {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*, units(count), assets(count)")
        .eq("is_archived", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (err) {
      console.error("Error fetching properties:", err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = properties.filter(
    (p) =>
      p.address?.toLowerCase().includes(search.toLowerCase()) ||
      p.city?.toLowerCase().includes(search.toLowerCase()) ||
      p.state?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Properties</h1>
          <p className="text-muted-foreground">
            Manage your rental properties
          </p>
        </div>
        <Button onClick={() => navigate("/properties/new")}>
          <Plus className="mr-1 size-4" />
          Add Property
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search properties..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-12">
              <Building2 className="mb-4 size-12 text-muted-foreground/50" />
              <p className="text-lg font-medium">No properties found</p>
              <p className="text-sm text-muted-foreground">
                {properties.length === 0
                  ? "Add your first property to get started"
                  : "Try adjusting your search"}
              </p>
              {properties.length === 0 && (
                <Button
                  className="mt-4"
                  onClick={() => navigate("/properties/new")}
                >
                  <Plus className="mr-1 size-4" />
                  Add Property
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Address</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Units</TableHead>
                    <TableHead className="text-center">Assets</TableHead>
                    <TableHead className="text-right">Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((property) => (
                    <TableRow
                      key={property.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/properties/${property.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <MapPin className="size-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{property.address}</p>
                            <p className="text-xs text-muted-foreground">
                              {[property.city, property.state, property.zip_code]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {property.property_type || "Not specified"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {property.units?.[0]?.count ?? property.number_of_units ?? 1}
                      </TableCell>
                      <TableCell className="text-center">
                        {property.assets?.[0]?.count ?? 0}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {new Date(property.created_at).toLocaleDateString()}
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
