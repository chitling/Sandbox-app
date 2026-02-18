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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Phone,
  Mail,
  Globe,
  MapPin,
  Star,
} from "lucide-react";

export function ContractorDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contractor, setContractor] = useState(null);
  const [serviceRecords, setServiceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    try {
      const [{ data: contData }, { data: services }] = await Promise.all([
        supabase
          .from("contractors")
          .select("*")
          .eq("id", id)
          .single(),
        supabase
          .from("service_records")
          .select(
            "*, assets(custom_name, properties(address))"
          )
          .eq("contractor_id", id)
          .order("service_date", { ascending: false }),
      ]);

      setContractor(contData);
      setServiceRecords(services || []);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async () => {
    try {
      await supabase.from("contractors").delete().eq("id", id);
      navigate("/contractors");
    } catch (err) {
      console.error("Error:", err);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-foreground">Loading...</div>
    );
  }

  if (!contractor) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg font-medium">Contractor not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate("/contractors")}
        >
          Back to Contractors
        </Button>
      </div>
    );
  }

  const totalSpent = serviceRecords.reduce(
    (sum, r) => sum + (parseFloat(r.total_cost) || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/contractors")}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {contractor.company_name}
            </h1>
            {contractor.contact_name && (
              <p className="text-muted-foreground">
                {contractor.contact_name}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/contractors/${id}/edit`)}
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
            <p className="text-sm text-muted-foreground">Total Jobs</p>
            <p className="text-2xl font-bold">{serviceRecords.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Spent</p>
            <p className="text-2xl font-bold">
              ${totalSpent.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Rating</p>
            <div className="flex items-center gap-1">
              {contractor.rating ? (
                <>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`size-5 ${
                        star <= contractor.rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted"
                      }`}
                    />
                  ))}
                </>
              ) : (
                <span className="text-lg font-bold">N/A</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {contractor.phone && (
                <a
                  href={`tel:${contractor.phone}`}
                  className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted"
                >
                  <Phone className="size-4 text-muted-foreground" />
                  <span className="text-sm">{contractor.phone}</span>
                </a>
              )}
              {contractor.email && (
                <a
                  href={`mailto:${contractor.email}`}
                  className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted"
                >
                  <Mail className="size-4 text-muted-foreground" />
                  <span className="text-sm">{contractor.email}</span>
                </a>
              )}
              {contractor.website && (
                <a
                  href={contractor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted"
                >
                  <Globe className="size-4 text-muted-foreground" />
                  <span className="text-sm">{contractor.website}</span>
                </a>
              )}
              {contractor.address && (
                <div className="flex items-center gap-3 rounded-lg p-2">
                  <MapPin className="size-4 text-muted-foreground" />
                  <span className="text-sm">{contractor.address}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              {contractor.services_offered?.length > 0 && (
                <div>
                  <dt className="mb-1 text-sm text-muted-foreground">
                    Services
                  </dt>
                  <dd className="flex flex-wrap gap-1">
                    {contractor.services_offered.map((s) => (
                      <Badge key={s} variant="secondary">
                        {s}
                      </Badge>
                    ))}
                  </dd>
                </div>
              )}
              {contractor.license_number && (
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">
                    License
                  </dt>
                  <dd className="text-sm font-medium">
                    {contractor.license_number}
                  </dd>
                </div>
              )}
              {contractor.insurance_expiration && (
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">
                    Insurance Expires
                  </dt>
                  <dd className="text-sm font-medium">
                    {new Date(
                      contractor.insurance_expiration
                    ).toLocaleDateString()}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Service History ({serviceRecords.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {serviceRecords.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No service records with this contractor yet
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
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
                      <TableCell className="whitespace-nowrap">
                        {new Date(
                          record.service_date
                        ).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {record.assets?.custom_name || "Unknown"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {record.service_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-48 truncate">
                        {record.description}
                      </TableCell>
                      <TableCell className="text-right font-medium">
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

      {contractor.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">
              {contractor.notes}
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contractor</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this contractor? Service
              records will retain the contractor reference. This action
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
    </div>
  );
}
