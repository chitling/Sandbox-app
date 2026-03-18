import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import supabase from "@/utils/supabase";
import { formatDate } from "@/utils/dates";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable, yearFilterFn } from "@/components/ui/data-table";
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
  const [globalFilter, setGlobalFilter] = useState("");

  useEffect(() => {
    fetchRecords();
  }, []);

  async function fetchRecords() {
    try {
      const { data, error } = await supabase
        .from("service_records")
        .select(
          "*, assets(custom_name, property_id, properties(address), asset_category_l1(name), asset_category_l3(name)), properties(address), contractors(company_name), maintenance_tasks(task_name)"
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

  const columns = useMemo(
    () => [
      {
        accessorFn: (row) => row.service_date,
        id: "service_date",
        header: "Date",
        meta: { title: "Date", filterVariant: "year" },
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap">{formatDate(getValue())}</span>
        ),
        sortingFn: "basic",
        filterFn: yearFilterFn,
      },
      {
        accessorFn: (row) =>
          row.assets?.custom_name ||
          row.assets?.asset_category_l3?.name ||
          row.properties?.address ||
          "Unknown",
        id: "asset_property",
        header: "Asset / Property",
        meta: { title: "Asset / Property" },
        cell: ({ row: r }) => {
          const record = r.original;
          return (
            <div>
              <p className="text-sm font-medium">
                {record.assets?.custom_name ||
                  record.assets?.asset_category_l3?.name ||
                  record.properties?.address ||
                  "Unknown"}
              </p>
              <p className="text-xs text-muted-foreground">
                {record.assets
                  ? record.assets.properties?.address || ""
                  : record.maintenance_tasks
                    ? `Task: ${record.maintenance_tasks.task_name}`
                    : ""}
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: "service_type",
        header: "Type",
        meta: {
          title: "Type",
          filterOptions: serviceTypes,
        },
        cell: ({ getValue }) => (
          <Badge variant="secondary">{getValue()}</Badge>
        ),
        filterFn: "equals",
      },
      {
        accessorKey: "description",
        header: "Description",
        meta: { title: "Description" },
        cell: ({ getValue }) => (
          <span className="block max-w-48 truncate">{getValue()}</span>
        ),
      },
      {
        accessorFn: (row) => row.contractors?.company_name || "",
        id: "contractor",
        header: "Contractor",
        meta: { title: "Contractor" },
        cell: ({ getValue }) => (
          <span className="text-sm">{getValue() || "-"}</span>
        ),
      },
      {
        accessorFn: (row) =>
          row.total_cost ? Number(row.total_cost) : null,
        id: "total_cost",
        header: "Cost",
        meta: { title: "Cost", align: "right" },
        cell: ({ getValue }) => {
          const val = getValue();
          return (
            <span className="font-medium">
              {val != null ? `$${val.toLocaleString()}` : "-"}
            </span>
          );
        },
        sortingFn: "basic",
        enableColumnFilter: false,
      },
    ],
    []
  );

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
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search records..."
                className="pl-9"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              Loading...
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={records}
              globalFilter={globalFilter}
              onGlobalFilterChange={setGlobalFilter}
              onRowClick={(record) =>
                navigate(`/service-records/${record.id}`)
              }
              emptyState={
                <div className="flex flex-col items-center py-12">
                  <Wrench className="mb-4 size-12 text-muted-foreground/50" />
                  <p className="text-lg font-medium">
                    No service records found
                  </p>
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
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
