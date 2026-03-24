import * as React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const TEMPLATE = `{
  "name": "",
  "email": "",
  "createdAt": "${new Date().toISOString()}"
}`;

export default function NewDocumentPage() {
  const { dbName, collection } = useParams<{ dbName: string; collection: string }>();
  const navigate = useNavigate();
  const [content, setContent] = React.useState(TEMPLATE);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

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
      const response = await fetch(`/api/databases/${dbName}/collections/${collection}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: content,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create document");
      }

      const doc = await response.json();
      navigate(`/db/${dbName}/${collection}/${doc._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create document");
      setSaving(false);
    }
  }

  const isValid = validateJson(content).valid;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to={`/db/${dbName}/${collection}`}>
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">New Document</h1>
            <p className="text-muted-foreground text-sm">Create a new document in {collection}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={!isValid || saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Document"}
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
          <CardDescription>Enter valid JSON for your document</CardDescription>
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
