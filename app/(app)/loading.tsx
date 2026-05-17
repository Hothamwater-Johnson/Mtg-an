export default function AppLoading() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="flex gap-1.5">
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
      </div>
    </div>
  )
}
