// O erro do campo entra no aria-describedby para o leitor de tela ler junto com o rótulo.
export const errorId = (field: string) => `${field}-error`;

export function describedBy(...ids: (string | false | undefined)[]): string | undefined {
  return ids.filter(Boolean).join(' ') || undefined;
}

export function FieldError({ field, message }: { field: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={errorId(field)} className="text-sm text-destructive">
      {message}
    </p>
  );
}
