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
import { Plus, Search, HardHat, Phone, Mail } from "lucide-react";

export function ContractorsPage() {
  const navigate = useNavigate();
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchContractors();
  }, []);

  async function fetchContractors() {
    try {
      const { data, error } = await supabase
        .from("contractors")
        .select("*, service_records(count)")
        .order("company_name");

      if (error) throw error;
      setContractors(data || []);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = contractors.filter(
    (c) =>
      !search ||
      c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.services_offered?.some((s) =>
        s.toLowerCase().includes(search.toLowerCase())
      )
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contractors</h1>
          <p className="text-muted-foreground">
            Manage your preferred contractors
          </p>
        </div>
        <Button onClick={() => navigate("/contractors/new")}>
          <Plus className="mr-1 size-4" />
          Add Contractor
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search contractors..."
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
              <HardHat className="mb-4 size-12 text-muted-foreground/50" />
              <p className="text-lg font-medium">No contractors found</p>
              <p className="text-sm text-muted-foreground">
                {contractors.length === 0
                  ? "Add your first contractor"
                  : "Try adjusting your search"}
              </p>
              {contractors.length === 0 && (
                <Button
                  className="mt-4"
                  onClick={() => navigate("/contractors/new")}
                >
                  <Plus className="mr-1 size-4" />
                  Add Contractor
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Services</TableHead>
                    <TableHead className="text-center">Jobs</TableHead>
                    <TableHead>Contact Info</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((contractor) => (
                    <TableRow
                      key={contractor.id}
                      className="cursor-pointer"
                      onClick={() =>
                        navigate(`/contractors/${contractor.id}`)
                      }
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <HardHat className="size-4 text-primary" />
                          </div>
                          <span className="font-medium">
                            {contractor.company_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {contractor.contact_name || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {contractor.services_offered
                            ?.slice(0, 3)
                            .map((s) => (
                              <Badge
                                key={s}
                                variant="secondary"
                                className="text-xs"
                              >
                                {s}
                              </Badge>
                            ))}
                          {(contractor.services_offered?.length || 0) >
                            3 && (
                            <Badge variant="secondary" className="text-xs">
                              +
                              {contractor.services_offered.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {contractor.service_records?.[0]?.count ?? 0}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {contractor.phone && (
                            <a
                              href={`tel:${contractor.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex size-7 items-center justify-center rounded-md hover:bg-muted"
                              title={contractor.phone}
                            >
                              <Phone className="size-3.5 text-muted-foreground" />
                            </a>
                          )}
                          {contractor.email && (
                            <a
                              href={`mailto:${contractor.email}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex size-7 items-center justify-center rounded-md hover:bg-muted"
                              title={contractor.email}
                            >
                              <Mail className="size-3.5 text-muted-foreground" />
                            </a>
                          )}
                        </div>
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
