import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="mt-auto border-t py-6 text-sm text-muted-foreground">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 sm:flex-row">
        <nav className="flex items-center gap-4">
          <Link to="/" className="hover:text-foreground">
            Home
          </Link>
          <Link to="/about" className="hover:text-foreground">
            About
          </Link>
        </nav>
      </div>
    </footer>
  );
}
