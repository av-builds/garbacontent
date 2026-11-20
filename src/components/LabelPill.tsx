export function LabelPill({ label }: { label: string }) {
  return (
    <span className="inline-block min-w-14 rounded-full bg-indigo-600 px-3 py-1 text-center text-base font-extrabold text-white print:border print:border-black print:bg-transparent print:text-black">
      {label}
    </span>
  );
}
