export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-orange-100 to-yellow-100">
      <img 
        src="/marmalady.gif"
        alt="Loading..."
        className="h-[500px] w-[500px] object-contain"
      />
    </div>
  );
}