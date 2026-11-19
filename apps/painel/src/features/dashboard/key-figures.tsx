import { Card } from '@/components/ui/card';

interface Figure {
  label: string;
  value: string;
}

/**
 * Hierarquia de números: um principal grande e os demais em linha, menores.
 * Substitui a grade de cartões iguais com ícone.
 */
export function KeyFigures({ main, rest }: { main: Figure; rest: Figure[] }) {
  return (
    <Card className="p-5 md:p-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <dl>
          <dt className="text-sm font-medium text-muted-foreground">{main.label}</dt>
          <dd className="mt-1 text-6xl leading-none font-extrabold tabular-nums font-stretch-extra-condensed text-foreground">
            {main.value}
          </dd>
        </dl>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:flex sm:flex-wrap md:justify-end">
          {rest.map((f) => (
            <div key={f.label}>
              <dt className="text-sm text-muted-foreground">{f.label}</dt>
              <dd className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Card>
  );
}
