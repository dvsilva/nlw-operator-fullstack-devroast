import Link from "next/link";

function NotFoundPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-10">
      <span className="font-mono text-6xl text-text-tertiary">404</span>

      <div className="flex flex-col items-center gap-2">
        <h1 className="font-mono text-xl font-bold text-text-primary">
          page_not_found
        </h1>
        <p className="font-mono text-sm text-text-secondary text-center max-w-md">
          {"// essa página não existe. talvez seu código tenha deletado ela."}
        </p>
      </div>

      <Link
        href="/"
        className="font-mono text-sm text-accent-green hover:underline"
      >
        {"$ cd ~"}
      </Link>
    </main>
  );
}

export default NotFoundPage;
