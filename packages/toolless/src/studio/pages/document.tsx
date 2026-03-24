import * as React from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Pencil, Trash2, ArrowLeft, Copy, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "@/components/theme-provider";

export default function DocumentPage() {
  const { dbName, collection, docId } = useParams<{
    dbName: string;
    collection: string;
    docId: string;
  }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [document, setDocument] = React.useState<Record<string, unknown> | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

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
      setDocument(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }

  async function handleDelete() {
    try {
      const response = await fetch(
        `/api/databases/${dbName}/collections/${collection}/documents/${docId}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) throw new Error("Failed to delete document");
      navigate(`/db/${dbName}/${collection}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  function handleCopy() {
    if (document) {
      navigator.clipboard.writeText(JSON.stringify(document, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-destructive mb-4">{error}</p>
        <Link to={`/db/${dbName}/${collection}`}>
          <Button>Back to Collection</Button>
        </Link>
      </div>
    );
  }

  if (!document) {
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
          <Link to={`/db/${dbName}/${collection}`}>
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight truncate font-mono">{docId}</h1>
            <p className="text-muted-foreground text-sm">Document</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCopy}>
            {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Link to={`/db/${dbName}/${collection}/${docId}/edit`}>
            <Button variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Document</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this document? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Document Data</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <SyntaxHighlighter
            language="json"
            style={isDark ? oneDark : oneLight}
            customStyle={{
              margin: 0,
              borderRadius: "0 0 calc(var(--radius) - 1px) calc(var(--radius) - 1px)",
              fontSize: "13px",
              fontFamily: "JetBrains Mono, ui-monospace, monospace",
            }}
            showLineNumbers
            lineNumberStyle={{ opacity: 0.4, minWidth: "2.5em" }}
          >
            {JSON.stringify(document, null, 2)}
          </SyntaxHighlighter>
        </CardContent>
      </Card>
    </div>
  );
}
