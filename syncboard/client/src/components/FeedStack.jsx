export default function FeedStack({ feed, onDismiss }) {
  if (!feed.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex flex-col items-center gap-2 px-4" aria-live="polite">
      {feed.map((m) => (
        <button
          key={m.id}
          onClick={() => onDismiss(m.id)}
          className={`toast-in pointer-events-auto max-w-md rounded-lg px-4 py-2.5 text-left text-sm font-medium shadow-lift ${
            m.tone === 'error' ? 'bg-danger text-white' : 'bg-ink text-white'
          }`}
        >
          {m.text}
        </button>
      ))}
    </div>
  );
}
