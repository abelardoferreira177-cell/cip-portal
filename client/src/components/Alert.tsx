export default function Alert({ title, message }: { title: string; message: string }) {
  return (
    <div className="card p-5 mt-6 border border-rose-100">
      <div className="text-sm font-bold text-rose-700">{title}</div>
      <div className="mt-1 text-sm text-slate-700">{message}</div>
    </div>
  );
}
