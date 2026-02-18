import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import supabase from "@/utils/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Plus,
  Package,
  Building2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [property, setProperty] = useState(null);
  const [units, setUnits] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUnitDialog, setShowUnitDialog] = useState(false);
  const [newUnitNumber, setNewUnitNumber] = useState("");

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    try {
      const [
        { data: prop },
        { data: unitsData },
        { data: assetsData },
      ] = await Promise.all([
        supabase.from("properties").select("*").eq("id", id).single(),
        supabase
          .from("units")
          .select("*")
          .eq("property_id", id)
          .order("unit_number"),
        supabase
          .from("assets")
          .select("*, asset_category_l1(name), asset_category_l3(name)")
          .eq("property_id", id)
          .eq("is_archived", false)
          .order("created_at", { ascending: false }),
      ]);

      setProperty(prop);
      setUnits(unitsData || []);
      setAssets(assetsData || []);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async () => {
    try {
      await supabase.from("properties").delete().eq("id", id);
      navigate("/properties");
    } catch (err) {
      console.error("Error deleting:", err);
    }
  };

  const handleAddUnit = async () => {
    if (!newUnitNumber.trim()) return;
    try {
      await supabase.from("units").insert({
        property_id: id,
        user_id: user.id,
        unit_number: newUnitNumber.trim(),
      });
      setNewUnitNumber("");
      setShowUnitDialog(false);
      fetchData();
    } catch (err) {
      console.error("Error adding unit:", err);
    }
  };

  const handleDeleteUnit = async (unitId) => {
    try {
      await supabase.from("units").delete().eq("id", unitId);
      fetchData();
    } catch (err) {
      console.error("Error deleting unit:", err);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-foreground">Loading...</div>
    );
  }

  if (!property) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg font-medium">Property not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate("/properties")}
        >
          Back to Properties
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/properties")}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {property.address}
            </h1>
            <p className="text-muted-foreground">
              {[property.city, property.state, property.zip_code]
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/properties/${id}/edit`)}
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
            <p className="text-sm text-muted-foreground">Property Type</p>
            <p className="text-lg font-semibold">
              {property.property_type || "Not specified"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Units</p>
            <p className="text-lg font-semibold">
              {units.length || property.number_of_units || 1}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Assets Tracked</p>
            <p className="text-lg font-semibold">{assets.length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="units">
        <TabsList>
          <TabsTrigger value="units">
            <Building2 className="mr-1 size-4" />
            Units
          </TabsTrigger>
          <TabsTrigger value="assets">
            <Package className="mr-1 size-4" />
            Assets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="units" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Units</CardTitle>
                <CardDescription>
                  Manage units for this property
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowUnitDialog(true)}>
                <Plus className="mr-1 size-4" />
                Add Unit
              </Button>
            </CardHeader>
            <CardContent>
              {units.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No units added yet. Add units if this is a multi-unit
                  property.
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Unit Number</TableHead>
                        <TableHead>Occupied</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {units.map((unit) => (
                        <TableRow key={unit.id}>
                          <TableCell className="font-medium">
                            {unit.unit_number}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                unit.tenant_occupied
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {unit.tenant_occupied ? "Occupied" : "Vacant"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => handleDeleteUnit(unit.id)}
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Assets</CardTitle>
                <CardDescription>
                  Equipment and systems at this property
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() =>
                  navigate(`/assets/new?property_id=${id}`)
                }
              >
                <Plus className="mr-1 size-4" />
                Add Asset
              </Button>
            </CardHeader>
            <CardContent>
              {assets.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No assets tracked for this property yet.
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Location</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assets.map((asset) => (
                        <TableRow
                          key={asset.id}
                          className="cursor-pointer"
                          onClick={() => navigate(`/assets/${asset.id}`)}
                        >
                          <TableCell className="font-medium">
                            {asset.custom_name ||
                              asset.asset_category_l3?.name ||
                              "Unnamed Asset"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {asset.asset_category_l1?.name || "Uncategorized"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {asset.location || "Not specified"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {property.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{property.notes}</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Property</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this property? This will also
              delete all associated units, assets, and records. This action
              cannot be undone.
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

      <Dialog open={showUnitDialog} onOpenChange={setShowUnitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Unit</DialogTitle>
            <DialogDescription>
              Add a unit to this property (e.g., &quot;1A&quot;, &quot;Apt
              201&quot;, &quot;Unit B&quot;)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="unitNumber">Unit Number</Label>
            <Input
              id="unitNumber"
              placeholder="e.g., 1A"
              value={newUnitNumber}
              onChange={(e) => setNewUnitNumber(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddUnit()}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUnitDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddUnit}>Add Unit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
