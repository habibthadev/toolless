import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CollectionInfo {
  name: string;
  count: number;
}

export default function DatabasePage() {
  const { dbName } = useParams<{ dbName: string }>();
  const [collections, setCollections] = React.useState<CollectionInfo[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (dbName) fetchCollections();
  }, [dbName]);

  async function fetchCollections() {
    try {
      const response = await fetch(`/api/databases/${dbName}/collections`);
      if (!response.ok) throw new Error("Failed to fetch collections");

      const data = await response.json();
      setCollections(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-destructive text-sm mb-4">{error}</p>
        <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{dbName}</h1>
        <p className="text-muted-foreground mt-1">
          {collections.length} {collections.length === 1 ? "collection" : "collections"}
        </p>
      </div>

      {collections.length === 0 ? (
        <div className="border border-dashed rounded-lg p-16 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="font-medium mb-1">No collections found</h3>
          <p className="text-sm text-muted-foreground mb-4">Create a collection using the CLI</p>
          <code className="inline-block bg-muted px-3 py-1.5 rounded text-xs font-mono">
            toolless insert {dbName} users '&#123;"name": "value"&#125;'
          </code>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((coll) => (
            <Link key={coll.name} to={`/db/${dbName}/${coll.name}`}>
              <div className="group border rounded-lg p-4 hover:border-foreground/20 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-md bg-secondary">
                      <FileText className="h-4 w-4 text-secondary-foreground" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-sm truncate">{coll.name}</h3>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {coll.count} {coll.count === 1 ? "document" : "documents"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
