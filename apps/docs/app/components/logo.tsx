export function Logo({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" className={className}>
      <title>Toolless</title>
      <rect x="0" y="0" width="6" height="6" className="fill-fd-foreground" />
      <rect x="8" y="0" width="6" height="6" className="fill-fd-foreground" />
      <rect x="0" y="8" width="6" height="6" className="fill-fd-foreground" />
    </svg>
  );
}
