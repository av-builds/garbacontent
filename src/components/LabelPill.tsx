export function LabelPill({ label }: { label: string }) {
  return (
    <span className="inline-block min-w-14 rounded-full bg-indigo-600 px-3 py-1 text-center text-base font-extrabold text-white">
      {label}
    </span>
  );
}
