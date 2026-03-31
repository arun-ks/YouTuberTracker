"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md px-6">
        <h2 className="text-xl font-bold text-red-400">
          Something went wrong
        </h2>
        <p className="text-sm text-neutral-500">{error.message}</p>
        <button
          onClick={reset}
          className="bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
