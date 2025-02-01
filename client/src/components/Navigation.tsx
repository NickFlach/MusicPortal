import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

export function Navigation() {
  const [location] = useLocation();

  const links = [
    { href: "/", label: "Home" },
    { href: "/treasury", label: "Treasury" },
    { href: "/admin", label: "Admin" },
  ];

  return (
    <nav className="flex items-center gap-6 ml-8">
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "text-sm transition-colors hover:text-primary",
            location === href
              ? "text-foreground font-medium"
              : "text-muted-foreground"
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
