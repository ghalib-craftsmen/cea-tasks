function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-gray-200 rounded shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}

export default SkeletonCard;
