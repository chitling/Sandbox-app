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
import { ArrowLeft, Edit, Trash2 } from "lucide-react";

export function ServiceRecordDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    fetchRecord();
  }, [id]);

  async function fetchRecord() {
    try {
      const { data } = await supabase
        .from("service_records")
        .select(
          "*, assets(custom_name, properties(address), asset_category_l1(name), asset_category_l3(name)), contractors(company_name, phone, email), vendors(company_name)"
        )
        .eq("id", id)
        .single();

      setRecord(data);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async () => {
    try {
      await supabase.from("service_records").delete().eq("id", id);
      navigate("/service-records");
    } catch (err) {
      console.error("Error deleting:", err);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-foreground">Loading...</div>
    );
  }

  if (!record) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg font-medium">Record not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate("/service-records")}
        >
          Back to Service Records
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/service-records")}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Service Record
            </h1>
            <p className="text-muted-foreground">
              {new Date(record.service_date).toLocaleDateString()} &middot;{" "}
              {record.service_type}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/service-records/${id}/edit`)}
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
            <p className="text-sm text-muted-foreground">Total Cost</p>
            <p className="text-2xl font-bold">
              {record.total_cost
                ? `$${Number(record.total_cost).toLocaleString()}`
                : "N/A"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Labor</p>
            <p className="text-lg font-semibold">
              {record.labor_cost
                ? `$${Number(record.labor_cost).toLocaleString()}`
                : "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Parts</p>
            <p className="text-lg font-semibold">
              {record.parts_cost
                ? `$${Number(record.parts_cost).toLocaleString()}`
                : "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Service Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Type</dt>
                <dd>
                  <Badge variant="secondary">{record.service_type}</Badge>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Date</dt>
                <dd className="text-sm font-medium">
                  {new Date(record.service_date).toLocaleDateString()}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Asset</dt>
                <dd
                  className="cursor-pointer text-sm font-medium text-primary hover:underline"
                  onClick={() => navigate(`/assets/${record.asset_id}`)}
                >
                  {record.assets?.custom_name ||
                    record.assets?.asset_category_l3?.name ||
                    "Unknown"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Property</dt>
                <dd className="text-sm font-medium">
                  {record.assets?.properties?.address || "Unknown"}
                </dd>
              </div>
              {record.is_warranty_work && (
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">
                    Warranty Work
                  </dt>
                  <dd>
                    <Badge>Yes</Badge>
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Contractor & Vendor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              {record.contractors ? (
                <>
                  <div className="flex justify-between">
                    <dt className="text-sm text-muted-foreground">
                      Contractor
                    </dt>
                    <dd className="text-sm font-medium">
                      {record.contractors.company_name}
                    </dd>
                  </div>
                  {record.contractors.phone && (
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">
                        Phone
                      </dt>
                      <dd className="text-sm">
                        {record.contractors.phone}
                      </dd>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No contractor assigned
                </p>
              )}
              {record.vendors && (
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">
                    Parts Vendor
                  </dt>
                  <dd className="text-sm font-medium">
                    {record.vendors.company_name}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm">{record.description}</p>
        </CardContent>
      </Card>

      {record.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{record.notes}</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Service Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this service record? This
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
