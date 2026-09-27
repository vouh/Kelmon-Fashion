import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display-md text-display-md text-primary mb-4">404</h1>
      <p className="font-body-lg text-body-lg text-on-surface-variant mb-8">Page not found</p>
      <Link href="/" className="kelmon-btn-primary px-8 rounded-full inline-flex items-center">
        Back to Home
      </Link>
    </div>
  );
}
