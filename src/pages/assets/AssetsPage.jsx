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
import { Plus, Search, Package } from "lucide-react";

export function AssetsPage() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [{ data: assetsData }, { data: catData }] = await Promise.all([
        supabase
          .from("assets")
          .select(
            "*, properties(address), asset_category_l1(name), asset_category_l2(name), asset_category_l3(name, default_lifespan_years)"
          )
          .eq("is_archived", false)
          .order("created_at", { ascending: false }),
        supabase.from("asset_category_l1").select("*").order("name"),
      ]);

      setAssets(assetsData || []);
      setCategories(catData || []);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = assets.filter((a) => {
    const matchesSearch =
      !search ||
      a.custom_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.properties?.address?.toLowerCase().includes(search.toLowerCase()) ||
      a.asset_category_l3?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" ||
      a.category_l1_id === parseInt(categoryFilter);
    return matchesSearch && matchesCategory;
  });

  function getLifeStatus(asset) {
    if (!asset.install_date || !asset.expected_lifespan_years) return null;
    const installDate = new Date(asset.install_date);
    const ageYears =
      (new Date() - installDate) / (1000 * 60 * 60 * 24 * 365.25);
    const remaining = asset.expected_lifespan_years - ageYears;
    if (remaining < 0) return { label: "Past EOL", variant: "destructive" };
    if (remaining < 1) return { label: "<1 yr", variant: "destructive" };
    if (remaining < 3) return { label: `${Math.round(remaining)} yrs`, variant: "secondary" };
    return { label: `${Math.round(remaining)} yrs`, variant: "secondary" };
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assets</h1>
          <p className="text-muted-foreground">
            Track equipment across your properties
          </p>
        </div>
        <Button onClick={() => navigate("/assets/new")}>
          <Plus className="mr-1 size-4" />
          Add Asset
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search assets..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {cat.name}
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
              <Package className="mb-4 size-12 text-muted-foreground/50" />
              <p className="text-lg font-medium">No assets found</p>
              <p className="text-sm text-muted-foreground">
                {assets.length === 0
                  ? "Add your first asset to start tracking"
                  : "Try adjusting your search or filters"}
              </p>
              {assets.length === 0 && (
                <Button
                  className="mt-4"
                  onClick={() => navigate("/assets/new")}
                >
                  <Plus className="mr-1 size-4" />
                  Add Asset
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-center">
                      Remaining Life
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((asset) => {
                    const life = getLifeStatus(asset);
                    return (
                      <TableRow
                        key={asset.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/assets/${asset.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                              <Package className="size-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {asset.custom_name ||
                                  asset.asset_category_l3?.name ||
                                  "Unnamed"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {asset.manufacturer || ""}
                                {asset.manufacturer && asset.model_number
                                  ? " - "
                                  : ""}
                                {asset.model_number || ""}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {asset.asset_category_l1?.name || "Uncategorized"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {asset.properties?.address || "Unknown"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {asset.location || "Not specified"}
                        </TableCell>
                        <TableCell className="text-center">
                          {life ? (
                            <Badge variant={life.variant}>{life.label}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              N/A
                            </span>
                          )}
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
    </div>
  );
}
