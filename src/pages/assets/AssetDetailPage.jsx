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
  Wrench,
  CalendarClock,
} from "lucide-react";

export function AssetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [serviceRecords, setServiceRecords] = useState([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    try {
      const [{ data: assetData }, { data: services }, { data: tasks }] =
        await Promise.all([
          supabase
            .from("assets")
            .select(
              "*, properties(address), units(unit_number), asset_category_l1(name), asset_category_l2(name), asset_category_l3(name, default_lifespan_years, default_maintenance_interval_months), vendors(company_name), contractors(company_name)"
            )
            .eq("id", id)
            .single(),
          supabase
            .from("service_records")
            .select("*, contractors(company_name)")
            .eq("asset_id", id)
            .order("service_date", { ascending: false }),
          supabase
            .from("maintenance_tasks")
            .select("*")
            .eq("asset_id", id)
            .order("next_due_date"),
        ]);

      setAsset(assetData);
      setServiceRecords(services || []);
      setMaintenanceTasks(tasks || []);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async () => {
    try {
      await supabase.from("assets").delete().eq("id", id);
      navigate("/assets");
    } catch (err) {
      console.error("Error deleting:", err);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-foreground">Loading...</div>
    );
  }

  if (!asset) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg font-medium">Asset not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate("/assets")}
        >
          Back to Assets
        </Button>
      </div>
    );
  }

  const ageYears = asset.install_date
    ? (
        (new Date() - new Date(asset.install_date)) /
        (1000 * 60 * 60 * 24 * 365.25)
      ).toFixed(1)
    : null;
  const remainingLife =
    asset.expected_lifespan_years && ageYears
      ? (asset.expected_lifespan_years - parseFloat(ageYears)).toFixed(1)
      : null;

  const totalSpent = serviceRecords.reduce(
    (sum, r) => sum + (parseFloat(r.total_cost) || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/assets")}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {asset.custom_name ||
                asset.asset_category_l3?.name ||
                "Unnamed Asset"}
            </h1>
            <p className="text-muted-foreground">
              {asset.properties?.address}
              {asset.units?.unit_number
                ? ` - ${asset.units.unit_number}`
                : ""}
              {asset.location && asset.location !== "Not specified"
                ? ` / ${asset.location}`
                : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/assets/${id}/edit`)}
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Category</p>
            <p className="text-sm font-semibold">
              {asset.asset_category_l1?.name}
            </p>
            {asset.asset_category_l3?.name && (
              <p className="text-xs text-muted-foreground">
                {asset.asset_category_l3.name}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Age</p>
            <p className="text-lg font-semibold">
              {ageYears ? `${ageYears} yrs` : "Unknown"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Remaining Life</p>
            <p className="text-lg font-semibold">
              {remainingLife != null ? (
                <span
                  className={
                    parseFloat(remainingLife) < 1
                      ? "text-destructive"
                      : parseFloat(remainingLife) < 3
                        ? "text-amber-600"
                        : ""
                  }
                >
                  {remainingLife} yrs
                </span>
              ) : (
                "N/A"
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Spent</p>
            <p className="text-lg font-semibold">
              ${totalSpent.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Equipment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              {[
                ["Manufacturer", asset.manufacturer],
                ["Model", asset.model_number],
                ["Serial Number", asset.serial_number],
                [
                  "Install Date",
                  asset.install_date
                    ? new Date(asset.install_date).toLocaleDateString()
                    : null,
                ],
                [
                  "Purchase Cost",
                  asset.purchase_cost
                    ? `$${Number(asset.purchase_cost).toLocaleString()}`
                    : null,
                ],
                [
                  "Expected Lifespan",
                  asset.expected_lifespan_years
                    ? `${asset.expected_lifespan_years} years`
                    : null,
                ],
              ]
                .filter(([, val]) => val)
                .map(([label, val]) => (
                  <div key={label} className="flex justify-between">
                    <dt className="text-sm text-muted-foreground">{label}</dt>
                    <dd className="text-sm font-medium">{val}</dd>
                  </div>
                ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Warranty & Vendor Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              {[
                ["Vendor", asset.vendors?.company_name],
                ["Installer", asset.contractors?.company_name],
                [
                  "Parts Warranty",
                  asset.parts_warranty_expiration
                    ? new Date(
                        asset.parts_warranty_expiration
                      ).toLocaleDateString()
                    : null,
                ],
                [
                  "Labor Warranty",
                  asset.labor_warranty_expiration
                    ? new Date(
                        asset.labor_warranty_expiration
                      ).toLocaleDateString()
                    : null,
                ],
              ]
                .filter(([, val]) => val)
                .map(([label, val]) => (
                  <div key={label} className="flex justify-between">
                    <dt className="text-sm text-muted-foreground">{label}</dt>
                    <dd className="text-sm font-medium">{val}</dd>
                  </div>
                ))}
              {!asset.vendors?.company_name &&
                !asset.contractors?.company_name &&
                !asset.parts_warranty_expiration &&
                !asset.labor_warranty_expiration && (
                  <p className="text-sm text-muted-foreground">
                    No warranty or vendor info recorded
                  </p>
                )}
            </dl>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="services">
        <TabsList>
          <TabsTrigger value="services">
            <Wrench className="mr-1 size-4" />
            Service History ({serviceRecords.length})
          </TabsTrigger>
          <TabsTrigger value="maintenance">
            <CalendarClock className="mr-1 size-4" />
            Maintenance Tasks ({maintenanceTasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Service Records</CardTitle>
              <Button
                size="sm"
                onClick={() =>
                  navigate(`/service-records/new?asset_id=${id}`)
                }
              >
                <Plus className="mr-1 size-4" />
                Add Record
              </Button>
            </CardHeader>
            <CardContent>
              {serviceRecords.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No service records yet
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Contractor</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {serviceRecords.map((record) => (
                        <TableRow
                          key={record.id}
                          className="cursor-pointer"
                          onClick={() =>
                            navigate(`/service-records/${record.id}`)
                          }
                        >
                          <TableCell>
                            {new Date(
                              record.service_date
                            ).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {record.service_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-48 truncate">
                            {record.description}
                          </TableCell>
                          <TableCell>
                            {record.contractors?.company_name || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {record.total_cost
                              ? `$${Number(record.total_cost).toLocaleString()}`
                              : "-"}
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

        <TabsContent value="maintenance" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Maintenance Tasks</CardTitle>
              <Button
                size="sm"
                onClick={() =>
                  navigate(`/maintenance/new?asset_id=${id}`)
                }
              >
                <Plus className="mr-1 size-4" />
                Add Task
              </Button>
            </CardHeader>
            <CardContent>
              {maintenanceTasks.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No maintenance tasks yet
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {maintenanceTasks.map((task) => {
                        const today = new Date()
                          .toISOString()
                          .split("T")[0];
                        const isOverdue =
                          task.status === "pending" &&
                          task.next_due_date < today;
                        return (
                          <TableRow
                            key={task.id}
                            className="cursor-pointer"
                            onClick={() =>
                              navigate(`/maintenance/${task.id}`)
                            }
                          >
                            <TableCell className="font-medium">
                              {task.task_name}
                            </TableCell>
                            <TableCell>
                              {new Date(
                                task.next_due_date
                              ).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  task.status === "completed"
                                    ? "default"
                                    : isOverdue
                                      ? "destructive"
                                      : "secondary"
                                }
                              >
                                {isOverdue ? "Overdue" : task.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {asset.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{asset.notes}</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Asset</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this asset? This will also
              delete all associated service records and maintenance tasks.
              This action cannot be undone.
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
