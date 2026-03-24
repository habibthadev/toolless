import * as React from "react";
import { Link } from "react-router-dom";
import { Database, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DatabaseInfo {
  name: string;
  collectionCount: number;
}

export default function Dashboard() {
  const [databases, setDatabases] = React.useState<DatabaseInfo[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchDatabases();
  }, []);

  async function fetchDatabases() {
    try {
      const response = await fetch("/api/databases");
      if (!response.ok) throw new Error("Failed to fetch databases");

      const data = await response.json();
      const dbList = Array.isArray(data) ? data : [];

      const dbInfos: DatabaseInfo[] = [];
      for (const db of dbList) {
        let collectionCount = 0;
        try {
          const collResponse = await fetch(`/api/databases/${db.name}/collections`);
          if (collResponse.ok) {
            const collections = await collResponse.json();
            collectionCount = Array.isArray(collections) ? collections.length : 0;
          }
        } catch {
          collectionCount = 0;
        }
        dbInfos.push({ name: db.name, collectionCount });
      }
      setDatabases(dbInfos);
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
        <h1 className="text-3xl font-semibold tracking-tight">Databases</h1>
        <p className="text-muted-foreground mt-1">Manage your collections and documents</p>
      </div>

      {databases.length === 0 ? (
        <div className="border border-dashed rounded-lg p-16 text-center">
          <Database className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="font-medium mb-1">No databases found</h3>
          <p className="text-sm text-muted-foreground mb-4">Create a database using the CLI</p>
          <code className="inline-block bg-muted px-3 py-1.5 rounded text-xs font-mono">
            toollessdb insert mydb users '&#123;"name": "value"&#125;'
          </code>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {databases.map((db) => (
            <Link key={db.name} to={`/db/${db.name}`}>
              <div className="group border rounded-lg p-4 hover:border-foreground/20 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-md bg-primary/10">
                      <Database className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-sm truncate">{db.name}</h3>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {db.collectionCount} {db.collectionCount === 1 ? "collection" : "collections"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
