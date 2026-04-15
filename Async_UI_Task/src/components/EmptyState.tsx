function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-4xl mb-4">📭</p>
      <p className="text-gray-700 font-medium mb-1">No stories found</p>
      <p className="text-sm text-gray-500">Try a different search term.</p>
    </div>
  );
}

export default EmptyState;
