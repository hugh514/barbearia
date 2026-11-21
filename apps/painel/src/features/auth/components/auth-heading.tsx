export function AuthHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-[1.75rem] leading-tight font-bold text-foreground">{title}</h1>
      <p className="mt-2 text-[0.9375rem] text-muted-foreground">{description}</p>
    </div>
  );
}
