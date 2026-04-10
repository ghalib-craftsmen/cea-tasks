interface Props {
  message: string;
  onRetry: () => void;
}

function ErrorMessage({ message, onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-4xl mb-4">⚠️</p>
      <p className="text-gray-700 font-medium mb-1">Something went wrong</p>
      <p className="text-sm text-gray-500 mb-6 max-w-xs">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

export default ErrorMessage;
