export function EducatorStatus({ isEducator, loading, error }) {
  if (loading) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg">
        <span className="text-gray-600">Checking educator status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <span className="text-red-600">Error: {error}</span>
      </div>
    );
  }

  if (isEducator) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <span className="text-green-700 font-medium">✓ Verified Educator</span>
      </div>
    );
  }

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <span className="text-yellow-700">Not authorized as educator</span>
    </div>
  );
}
