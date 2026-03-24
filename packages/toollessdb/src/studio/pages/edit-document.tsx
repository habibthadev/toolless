import * as React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function EditDocumentPage() {
  const { dbName, collection, docId } = useParams<{
    dbName: string;
    collection: string;
    docId: string;
  }>();
  const navigate = useNavigate();
  const [content, setContent] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    if (dbName && collection && docId) fetchDocument();
  }, [dbName, collection, docId]);

  async function fetchDocument() {
    try {
      const response = await fetch(
        `/api/databases/${dbName}/collections/${collection}/documents/${docId}`
      );
      if (!response.ok) throw new Error("Failed to fetch document");
      const data = await response.json();
      setContent(JSON.stringify(data, null, 2));
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }

  function validateJson(str: string): { valid: boolean; error?: string } {
    try {
      JSON.parse(str);
      return { valid: true };
    } catch (e) {
      return { valid: false, error: e instanceof Error ? e.message : "Invalid JSON" };
    }
  }

  async function handleSave() {
    const validation = validateJson(content);
    if (!validation.valid) {
      setError(validation.error || "Invalid JSON");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/databases/${dbName}/collections/${collection}/documents/${docId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: content,
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update document");
      }

      navigate(`/db/${dbName}/${collection}/${docId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update document");
      setSaving(false);
    }
  }

  const isValid = validateJson(content).valid;

  if (!loaded && !error) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <Card>
          <CardContent className="py-8">
            <div className="h-64 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to={`/db/${dbName}/${collection}/${docId}`}>
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight">Edit Document</h1>
            <p className="text-muted-foreground text-sm truncate font-mono">{docId}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={!isValid || saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Document Data</CardTitle>
          <CardDescription>Modify the JSON and save your changes</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[400px] font-mono text-sm"
            placeholder="Enter JSON..."
          />
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${isValid ? "bg-green-500" : "bg-yellow-500"}`} />
        <span className="text-sm text-muted-foreground">
          {isValid ? "Valid JSON" : "Invalid JSON"}
        </span>
      </div>
    </div>
  );
}
