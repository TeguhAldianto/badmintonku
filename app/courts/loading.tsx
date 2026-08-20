export default function Loading() {
  return (
    <div className="container-app py-20 text-center">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4 mx-auto"></div>
        <div className="h-64 bg-gray-100 rounded w-full max-w-2xl mx-auto"></div>
      </div>
    </div>
  );
}
