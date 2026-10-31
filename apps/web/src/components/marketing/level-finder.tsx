'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export interface LevelFinderTournament {
  slug: string;
  name: string;
  startsAt: string;
  /** null = abierto a todos los niveles (casual). */
  category: string | null;
}

const QUESTIONS: { q: string; options: string[] }[] = [
  {
    q: '¿Hace cuánto juegas pádel?',
    options: ['Empecé este año', '1 a 2 años', '3 a 5 años', 'Más de 5 años'],
  },
  {
    q: '¿Cómo te va con la pared?',
    options: [
      'Todavía me cuesta',
      'Devuelvo las fáciles',
      'Salgo de pared con intención',
      'Bandeja y víbora sin pensarlo',
    ],
  },
  {
    q: '¿Juegas torneos?',
    options: ['Nunca', 'Americanos del club', 'Torneos por categoría', 'Llego a finales'],
  },
  {
    q: '¿Cuántas veces juegas por semana?',
    options: ['Una o menos', 'Dos', 'Tres', 'Cuatro o más'],
  },
];

// Cada respuesta vale 0-3; el total (0-12) se reparte en las 6 categorias.
const LEVELS: Record<number, { name: string; desc: string }> = {
  6: { name: 'Iniciación', desc: 'Estás aprendiendo los golpes. Los americanos casuales son tu mejor escuela.' },
  5: { name: 'Novato', desc: 'Ya mantienes el punto. Toca empezar a competir en serio.' },
  4: { name: 'Intermedio', desc: 'Lees el juego y usas la pared. La categoría con más torneos.' },
  3: { name: 'Avanzado', desc: 'Juegas con plan y presionas en la red. Aquí se pelea cada punto.' },
  2: { name: 'Experto', desc: 'Tienes recursos para todo. Pocos te sacan de la cancha.' },
  1: { name: 'Élite', desc: 'Lo más alto del pádel amateur. A defender la corona.' },
};

function categoryFor(total: number): number {
  return Math.max(1, 6 - Math.floor(total / 2));
}

export function LevelFinder({ tournaments }: { tournaments: LevelFinderTournament[] }) {
  const [answers, setAnswers] = useState<number[]>([]);
  const step = answers.length;
  const done = step === QUESTIONS.length;
  const category = done ? categoryFor(answers.reduce((a, b) => a + b, 0)) : null;
  const level = category ? LEVELS[category]! : null;
  const matching = category
    ? tournaments.filter((t) => t.category === null || t.category === String(category)).slice(0, 3)
    : [];

  return (
    <section id="nivel" className="mx-auto max-w-3xl scroll-mt-20 px-6 py-20">
      <div className="mb-8 text-center">
        <p className="text-crown font-mono text-xs uppercase tracking-widest">Test de nivel · 20 segundos</p>
        <h2 className="font-display mt-3 text-balance text-3xl tracking-tight md:text-5xl">
          ¿CUÁL ES TU <span className="text-crown">CATEGORÍA?</span>
        </h2>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="bg-muted h-1">
          <div
            className="bg-crown h-full transition-[width] duration-300"
            style={{ width: `${(step / QUESTIONS.length) * 100}%` }}
          />
        </div>

        {!done ? (
          <div key={step} className="animate-in fade-in slide-in-from-right-4 p-6 duration-300 md:p-10">
            <div className="text-muted-foreground text-[10px] uppercase tracking-widest">
              Pregunta {step + 1} de {QUESTIONS.length}
            </div>
            <p className="font-display mt-2 text-2xl tracking-tight md:text-3xl">{QUESTIONS[step]!.q}</p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {QUESTIONS[step]!.options.map((opt, idx) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setAnswers([...answers, idx])}
                  className="border-border hover:border-crown hover:bg-crown/[0.06] min-h-12 rounded-lg border px-4 py-3 text-left text-sm transition-colors"
                >
                  {opt}
                </button>
              ))}
            </div>
            {step > 0 && (
              <button
                type="button"
                onClick={() => setAnswers(answers.slice(0, -1))}
                className="text-muted-foreground hover:text-foreground mt-4 min-h-11 text-xs uppercase tracking-widest"
              >
                ← Anterior
              </button>
            )}
          </div>
        ) : (
          <div className="animate-in fade-in zoom-in-95 p-6 text-center duration-500 md:p-10">
            <div className="text-muted-foreground text-[10px] uppercase tracking-widest">Tu categoría</div>
            <div className="font-display text-crown mt-1 text-8xl leading-none tracking-tight md:text-9xl">
              {category}ª
            </div>
            <div className="font-display mt-2 text-2xl tracking-tight">{level!.name.toUpperCase()}</div>
            <p className="text-muted-foreground mx-auto mt-3 max-w-md text-balance text-sm">{level!.desc}</p>
            <p className="text-muted-foreground mx-auto mt-1 max-w-md text-xs">
              En torneos de suma aportas {category} puntos a tu pareja.
            </p>

            {matching.length > 0 && (
              <div className="mx-auto mt-8 max-w-md text-left">
                <div className="text-muted-foreground mb-2 text-[10px] uppercase tracking-widest">
                  Torneos abiertos para ti
                </div>
                <div className="divide-border/40 border-border/40 divide-y rounded-lg border">
                  {matching.map((t) => (
                    <Link
                      key={t.slug}
                      href={`/tournaments/${t.slug}`}
                      className="hover:bg-muted/40 flex min-h-12 items-center justify-between gap-3 px-4 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate">{t.name}</span>
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {new Date(t.startsAt).toLocaleDateString('es-CO', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          timeZone: 'America/Bogota',
                        })}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-col items-center gap-3">
              <Button variant="crown" size="xl" asChild>
                <Link href="/signup">
                  Jugar en {category}ª
                  <ArrowRight className="size-5" />
                </Link>
              </Button>
              <button
                type="button"
                onClick={() => setAnswers([])}
                className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-1.5 text-xs uppercase tracking-widest"
              >
                <RotateCcw className="size-3" />
                Repetir test
              </button>
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}
