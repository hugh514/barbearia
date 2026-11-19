'use client';

import { useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { BRAND_PRESETS, normalizeHex, themeFrom, type ThemeMode } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { NO_CONFIG_MESSAGE, saveAppearance, type Appearance } from './appearance-services';

const MODES: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
];

export function AppearanceForm({
  initial,
  configExists = true,
}: {
  initial: Appearance;
  /** Sem configuração da barbearia a API não aceita o PATCH. */
  configExists?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [hex, setHex] = useState(initial.brandColor.toUpperCase());
  const [mode, setMode] = useState<ThemeMode>(initial.themeMode);

  const valid = normalizeHex(hex);
  const preview = themeFrom({ brandColor: valid, themeMode: mode });

  const save = useMutation({
    mutationFn: (values: Appearance) => saveAppearance(values),
    onSuccess: () => {
      toast('Aparência salva.');
      router.refresh();
    },
    onError: (e) =>
      toast(e instanceof Error ? e.message : 'Não foi possível salvar. Tente de novo.', 'error'),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aparência</CardTitle>
        <CardDescription>
          Cor da barbearia e modo de tela. Vale para o painel e para o app do cliente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-6 lg:grid-cols-[1fr_18rem]"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid && configExists) save.mutate({ brandColor: valid, themeMode: mode });
          }}
        >
          <div className="space-y-5">
            <fieldset>
              <legend className="mb-2 text-[13px] font-semibold text-foreground">Cor</legend>
              <div className="flex flex-wrap gap-2">
                {BRAND_PRESETS.map((p) => {
                  const checked = valid === p.hex.toLowerCase();
                  return (
                    <label
                      key={p.hex}
                      className={cn(
                        'flex h-10 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
                        checked ? 'border-foreground font-semibold' : 'border-input',
                      )}
                    >
                      <input
                        type="radio"
                        name="brand-preset"
                        value={p.hex}
                        checked={checked}
                        onChange={() => setHex(p.hex)}
                        className="sr-only"
                      />
                      {/* A amostra é a própria cor escolhida: dado, não estilo. */}
                      <span
                        aria-hidden
                        className="size-4 rounded-sm"
                        style={{ background: p.hex }}
                      />
                      {p.name}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="max-w-xs space-y-2">
              <Label htmlFor="brand-hex">Cor em hex</Label>
              <Input
                id="brand-hex"
                value={hex}
                onChange={(e) => setHex(e.target.value)}
                invalid={!valid}
                aria-describedby={valid ? undefined : 'brand-hex-erro'}
                spellCheck={false}
                autoComplete="off"
              />
              {!valid && (
                <p id="brand-hex-erro" className="text-sm text-destructive">
                  Use o formato #RRGGBB, por exemplo #1F4FB8.
                </p>
              )}
            </div>

            <fieldset>
              <legend className="mb-2 text-[13px] font-semibold text-foreground">Modo</legend>
              <div className="flex gap-2">
                {MODES.map((m) => (
                  <label
                    key={m.value}
                    className={cn(
                      'flex h-10 cursor-pointer items-center rounded-md border px-4 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
                      mode === m.value ? 'border-foreground font-semibold' : 'border-input',
                    )}
                  >
                    <input
                      type="radio"
                      name="theme-mode"
                      value={m.value}
                      checked={mode === m.value}
                      onChange={() => setMode(m.value)}
                      className="sr-only"
                    />
                    {m.label}
                  </label>
                ))}
              </div>
            </fieldset>

            {!configExists && (
              <p className="text-sm text-muted-foreground">{NO_CONFIG_MESSAGE}</p>
            )}
            <Button type="submit" disabled={!valid || !configExists || save.isPending}>
              {save.isPending ? 'Salvando…' : 'Salvar aparência'}
            </Button>
          </div>

          <div
            data-theme={preview.mode}
            style={preview.vars as CSSProperties}
            className="space-y-3 rounded-lg border border-border bg-background p-4 text-foreground"
            aria-label="Prévia"
            role="group"
          >
            <p className="text-xs text-muted-foreground">Prévia</p>
            <div className="flex items-start gap-3 rounded-lg border border-primary bg-accent p-3">
              <span className="text-3xl leading-none font-extrabold tabular-nums font-stretch-extra-condensed">
                03
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">João Pereira</p>
                <p className="text-xs text-muted-foreground">Corte e barba</p>
              </div>
            </div>
            <span className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">
              Finalizar atendimento
            </span>
            <p className="text-sm font-semibold text-primary-text">Ver histórico</p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
