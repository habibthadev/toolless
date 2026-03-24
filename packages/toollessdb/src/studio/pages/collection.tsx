import * as React from "react";
import { useParams } from "react-router-dom";
import { Plus, Trash2, Search, Copy, Check, Save, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "@/components/theme-provider";

interface Document {
  _id: string;
  [key: string]: unknown;
}

export default function CollectionPage() {
  const { dbName, collection } = useParams<{ dbName: string; collection: string }>();
  const { theme } = useTheme();
  const [documents, setDocuments] = React.useState<Document[]>([]);
  const [total, setTotal] = React.useState(0);
  const [search, setSearch] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = React.useState<Document | null>(null);
  const [editDoc, setEditDoc] = React.useState<string>("");
  const [isEditing, setIsEditing] = React.useState(false);
  const [deleteDoc, setDeleteDoc] = React.useState<Document | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [showCreate, setShowCreate] = React.useState(false);
  const [newDoc, setNewDoc] = React.useState(
    '{\n  "name": "",\n  "createdAt": "' + new Date().toISOString() + '"\n}'
  );
  const [expandedDocs, setExpandedDocs] = React.useState<Set<string>>(new Set());

  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  React.useEffect(() => {
    if (dbName && collection) fetchDocuments();
  }, [dbName, collection]);

  async function fetchDocuments() {
    try {
      const url = `/api/databases/${dbName}/collections/${collection}/documents?limit=100`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch documents");

      const data = await response.json();
      setDocuments(data.documents || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }

  async function handleDelete(doc: Document) {
    try {
      const response = await fetch(
        `/api/databases/${dbName}/collections/${collection}/documents/${doc._id}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) throw new Error("Failed to delete document");
      setDocuments((prev) => prev.filter((d) => d._id !== doc._id));
      setTotal((prev) => prev - 1);
      setDeleteDoc(null);
      if (selectedDoc?._id === doc._id) setSelectedDoc(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  async function handleSave() {
    if (!selectedDoc) return;

    try {
      const parsed = JSON.parse(editDoc);
      const response = await fetch(
        `/api/databases/${dbName}/collections/${collection}/documents/${selectedDoc._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed),
        }
      );

      if (!response.ok) throw new Error("Failed to update document");

      setDocuments((prev) =>
        prev.map((d) => (d._id === selectedDoc._id ? { ...parsed, _id: selectedDoc._id } : d))
      );
      setSelectedDoc({ ...parsed, _id: selectedDoc._id });
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  }

  async function handleCreate() {
    try {
      const parsed = JSON.parse(newDoc);
      const response = await fetch(`/api/databases/${dbName}/collections/${collection}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });

      if (!response.ok) throw new Error("Failed to create document");

      const created = await response.json();
      setDocuments((prev) => [created, ...prev]);
      setTotal((prev) => prev + 1);
      setShowCreate(false);
      setNewDoc('{\n  "name": "",\n  "createdAt": "' + new Date().toISOString() + '"\n}');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    }
  }

  function handleCopy() {
    if (selectedDoc) {
      navigator.clipboard.writeText(JSON.stringify(selectedDoc, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function openView(doc: Document) {
    setSelectedDoc(doc);
    setEditDoc(JSON.stringify(doc, null, 2));
    setIsEditing(false);
  }

  function toggleExpand(id: string) {
    setExpandedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filteredDocs = search
    ? documents.filter((doc) => JSON.stringify(doc).toLowerCase().includes(search.toLowerCase()))
    : documents;

  const isValidJson = (str: string) => {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-destructive text-sm mb-4">{error}</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setError(null);
            fetchDocuments();
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{collection}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {total} {total === 1 ? "document" : "documents"}
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            New
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {filteredDocs.length === 0 ? (
          <div className="border border-dashed rounded-lg p-12 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              {search ? "No matching documents" : "No documents yet"}
            </p>
            {!search && (
              <Button onClick={() => setShowCreate(true)} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1.5" />
                Create First Document
              </Button>
            )}
          </div>
        ) : (
          <div className="border rounded-lg divide-y">
            {filteredDocs.map((doc) => {
              const isExpanded = expandedDocs.has(doc._id);
              const preview = Object.entries(doc)
                .filter(([key]) => key !== "_id")
                .slice(0, 3)
                .map(([key, val]) => `${key}: ${JSON.stringify(val)}`)
                .join(", ");

              return (
                <div key={doc._id} className="p-3 hover:bg-accent/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleExpand(doc._id)}
                      className="mt-0.5 p-1 -m-1 hover:bg-accent rounded transition-colors shrink-0"
                    >
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "" : "-rotate-90"}`}
                      />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-xs font-mono text-muted-foreground">{doc._id}</code>
                      </div>
                      {!isExpanded && (
                        <p className="text-sm text-muted-foreground truncate">{preview}</p>
                      )}
                      {isExpanded && (
                        <pre className="text-xs font-mono bg-muted/50 p-2 rounded mt-2 overflow-x-auto">
                          {JSON.stringify(doc, null, 2)}
                        </pre>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => openView(doc)}
                      >
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteDoc(doc)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Sheet open={!!selectedDoc} onOpenChange={(open) => !open && setSelectedDoc(null)}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-mono text-base">{selectedDoc?._id}</SheetTitle>
            <SheetDescription>
              {isEditing ? "Edit document data" : "View document data"}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {!isEditing ? (
              <>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleCopy}>
                    {copied ? (
                      <Check className="h-4 w-4 mr-1.5" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1.5" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setDeleteDoc(selectedDoc);
                      setSelectedDoc(null);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Delete
                  </Button>
                </div>
                <div className="rounded-lg overflow-hidden border">
                  <SyntaxHighlighter
                    language="json"
                    style={isDark ? oneDark : oneLight}
                    customStyle={{
                      margin: 0,
                      fontSize: "13px",
                      fontFamily: "JetBrains Mono, ui-monospace, monospace",
                    }}
                    showLineNumbers
                    lineNumberStyle={{ opacity: 0.4, minWidth: "2.5em" }}
                  >
                    {JSON.stringify(selectedDoc, null, 2)}
                  </SyntaxHighlighter>
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label htmlFor="edit-json">JSON Data</Label>
                  <Textarea
                    id="edit-json"
                    value={editDoc}
                    onChange={(e) => setEditDoc(e.target.value)}
                    className="font-mono text-sm mt-1.5 min-h-[400px]"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <div
                      className={`h-2 w-2 rounded-full ${isValidJson(editDoc) ? "bg-green-500" : "bg-destructive"}`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {isValidJson(editDoc) ? "Valid JSON" : "Invalid JSON"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={!isValidJson(editDoc)} size="sm">
                    <Save className="h-4 w-4 mr-1.5" />
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setEditDoc(JSON.stringify(selectedDoc, null, 2));
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create Document</SheetTitle>
            <SheetDescription>Add a new document to {collection}</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="new-json">JSON Data</Label>
              <Textarea
                id="new-json"
                value={newDoc}
                onChange={(e) => setNewDoc(e.target.value)}
                className="font-mono text-sm mt-1.5 min-h-[400px]"
              />
              <div className="flex items-center gap-2 mt-2">
                <div
                  className={`h-2 w-2 rounded-full ${isValidJson(newDoc) ? "bg-green-500" : "bg-destructive"}`}
                />
                <span className="text-xs text-muted-foreground">
                  {isValidJson(newDoc) ? "Valid JSON" : "Invalid JSON"}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={!isValidJson(newDoc)} size="sm">
                <Save className="h-4 w-4 mr-1.5" />
                Create Document
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteDoc} onOpenChange={(open) => !open && setDeleteDoc(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the document. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDoc && handleDelete(deleteDoc)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
