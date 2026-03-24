import * as React from "react";
import { Link, Outlet, useLocation, useParams } from "react-router-dom";
import { Database, Home, Sun, Moon, Menu, X, Layers, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

interface DbInfo {
  name: string;
}

export function Layout() {
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const params = useParams();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [databases, setDatabases] = React.useState<DbInfo[]>([]);

  React.useEffect(() => {
    fetch("/api/databases")
      .then((res) => res.json())
      .then((data) => setDatabases(Array.isArray(data) ? data : []))
      .catch(() => setDatabases([]));
  }, []);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const breadcrumbs = React.useMemo(() => {
    const items: { label: string; href: string }[] = [];
    if (params.dbName) {
      items.push({ label: params.dbName, href: `/db/${params.dbName}` });
    }
    if (params.collection) {
      items.push({ label: params.collection, href: `/db/${params.dbName}/${params.collection}` });
    }
    return items;
  }, [params]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <Link to="/" className="flex items-center gap-2 font-semibold text-sm">
            <Layers className="h-5 w-5" />
            <span>Toolless Studio</span>
          </Link>

          {breadcrumbs.length > 0 && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <nav className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
                {breadcrumbs.map((item, i) => (
                  <React.Fragment key={item.href}>
                    {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
                    <Link
                      to={item.href}
                      className={cn(
                        "hover:text-foreground transition-colors px-1",
                        location.pathname === item.href && "text-foreground font-medium"
                      )}
                    >
                      {item.label}
                    </Link>
                  </React.Fragment>
                ))}
              </nav>
            </>
          )}

          <div className="ml-auto">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-30 w-64 border-r bg-background pt-14 transition-transform md:static md:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <ScrollArea className="h-[calc(100vh-3.5rem)] py-6 px-3">
            <div className="space-y-4">
              <div>
                <h2 className="mb-2 px-3 text-xs font-semibold tracking-tight text-muted-foreground uppercase">
                  Navigation
                </h2>
                <div className="space-y-1">
                  <Link to="/">
                    <Button
                      variant={location.pathname === "/" ? "secondary" : "ghost"}
                      className="w-full justify-start h-9 px-3"
                      size="sm"
                    >
                      <Home className="mr-2.5 h-4 w-4" />
                      Dashboard
                    </Button>
                  </Link>
                </div>
              </div>

              {databases.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h2 className="mb-2 px-3 text-xs font-semibold tracking-tight text-muted-foreground uppercase">
                      Databases
                    </h2>
                    <div className="space-y-1">
                      {databases.map((db) => (
                        <Link key={db.name} to={`/db/${db.name}`}>
                          <Button
                            variant={params.dbName === db.name ? "secondary" : "ghost"}
                            className="w-full justify-start h-9 px-3"
                            size="sm"
                          >
                            <Database className="mr-2.5 h-4 w-4" />
                            {db.name}
                          </Button>
                        </Link>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 overflow-auto">
          <div className="container py-8 px-4 md:px-6 max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
