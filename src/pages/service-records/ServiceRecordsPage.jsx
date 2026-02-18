import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import supabase from "@/utils/supabase";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Wrench } from "lucide-react";

const serviceTypes = [
  "Preventative Maintenance",
  "Repair",
  "Replacement",
  "Inspection",
];

export function ServiceRecordsPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    fetchRecords();
  }, []);

  async function fetchRecords() {
    try {
      const { data, error } = await supabase
        .from("service_records")
        .select(
          "*, assets(custom_name, property_id, properties(address), asset_category_l1(name)), contractors(company_name)"
        )
        .order("service_date", { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = records.filter((r) => {
    const matchesSearch =
      !search ||
      r.description?.toLowerCase().includes(search.toLowerCase()) ||
      r.assets?.custom_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.assets?.properties?.address
        ?.toLowerCase()
        .includes(search.toLowerCase()) ||
      r.contractors?.company_name
        ?.toLowerCase()
        .includes(search.toLowerCase());
    const matchesType =
      typeFilter === "all" || r.service_type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Service Records
          </h1>
          <p className="text-muted-foreground">
            Track all maintenance and repair work
          </p>
        </div>
        <Button onClick={() => navigate("/service-records/new")}>
          <Plus className="mr-1 size-4" />
          Add Record
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search records..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {serviceTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-12">
              <Wrench className="mb-4 size-12 text-muted-foreground/50" />
              <p className="text-lg font-medium">No service records found</p>
              <p className="text-sm text-muted-foreground">
                {records.length === 0
                  ? "Log your first service record"
                  : "Try adjusting your search or filters"}
              </p>
              {records.length === 0 && (
                <Button
                  className="mt-4"
                  onClick={() => navigate("/service-records/new")}
                >
                  <Plus className="mr-1 size-4" />
                  Add Record
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Contractor</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((record) => (
                    <TableRow
                      key={record.id}
                      className="cursor-pointer"
                      onClick={() =>
                        navigate(`/service-records/${record.id}`)
                      }
                    >
                      <TableCell className="whitespace-nowrap">
                        {new Date(record.service_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">
                            {record.assets?.custom_name || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {record.assets?.properties?.address || ""}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {record.service_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-48 truncate">
                        {record.description}
                      </TableCell>
                      <TableCell className="text-sm">
                        {record.contractors?.company_name || "-"}
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
    </div>
  );
}
