export default function ComingSoon({ title }: { title: string }) {
  return (
    <div className="py-12 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-neutral-600">This page is not built yet.</p>
    </div>
  );
}
