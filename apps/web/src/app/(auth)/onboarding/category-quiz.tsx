'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronDown, Sparkles } from 'lucide-react';

import { CATEGORY_LABELS } from '@padelking/domain';

import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type Gender = 'male' | 'female';

interface Question {
  id: string;
  label: string;
  options: { label: string; score: number }[];
}

const QUESTIONS: Question[] = [
  {
    id: 'years',
    label: '¿Hace cuánto juegas pádel?',
    options: [
      { label: 'Estoy empezando', score: 0 },
      { label: 'Menos de 1 año', score: 2 },
      { label: '1 a 2 años', score: 4 },
      { label: '3 a 5 años', score: 6 },
      { label: 'Más de 5 años', score: 8 },
    ],
  },
  {
    id: 'frequency',
    label: '¿Con qué frecuencia juegas?',
    options: [
      { label: 'Rara vez', score: 0 },
      { label: '1 vez al mes', score: 1 },
      { label: '1 vez por semana', score: 2 },
      { label: '2-3 veces por semana', score: 4 },
      { label: 'Casi diario', score: 5 },
    ],
  },
  {
    id: 'racquet_bg',
    label: '¿Jugaste tenis u otro deporte de raqueta antes?',
    options: [
      { label: 'Nunca', score: 0 },
      { label: 'Casual', score: 1 },
      { label: '1+ años amateur', score: 2 },
      { label: 'Compitiendo / federado', score: 3 },
    ],
  },
  {
    id: 'best_result',
    label: '¿Tu mejor resultado en un torneo?',
    options: [
      { label: 'No he jugado torneos', score: 0 },
      { label: 'Eliminado en primera ronda', score: 1 },
      { label: 'Pasé fase de grupos', score: 2 },
      { label: 'Cuartos / semis', score: 3 },
      { label: 'Final', score: 3 },
      { label: 'Campeón', score: 4 },
    ],
  },
  {
    id: 'opponents',
    label: '¿Contra qué nivel ganas habitualmente?',
    options: [
      { label: 'Más bajos que yo', score: 0 },
      { label: 'A mi mismo nivel', score: 2 },
      { label: 'A veces les gano a más altos', score: 3 },
      { label: 'Le gano a niveles superiores', score: 5 },
    ],
  },
  {
    id: 'self',
    label: '¿Cómo te describirías técnicamente?',
    options: [
      { label: 'Estoy aprendiendo', score: 0 },
      { label: 'Sé lo básico', score: 1 },
      { label: 'Drives + reveses consistentes', score: 2 },
      { label: 'Manejo bandejas y víboras', score: 3 },
      { label: 'Juego inteligente, gano con tácticas', score: 4 },
    ],
  },
];

const MAX_SCORE = QUESTIONS.reduce((acc, q) => acc + Math.max(...q.options.map((o) => o.score)), 0);

// Score → level 1..7 (1=7ma novato, 7=1ra elite amateur)
// Calibracion conservadora: sugerencia tiende a banda BAJA. El organizador
// puede subirla con un click. Es peor inflar al jugador que pecar de cauto.
// MAX_SCORE = 29 con pesos actuales. Thresholds calibrados para que un
// score "alto pero no perfecto" (24-27) sugiera 3ra-2da, no 1ra directo.
function scoreToLevel(score: number): number {
  if (score <= 3) return 1;   // 7ma — novato real
  if (score <= 7) return 2;   // 6ta
  if (score <= 12) return 3;  // 5ta
  if (score <= 17) return 4;  // 4ta
  if (score <= 23) return 5;  // 3ra
  if (score <= 27) return 6;  // 2da
  return 7;                   // 1ra solo con score casi perfecto
}

const KING_LEVELS = ['septima', 'sexta', 'quinta', 'cuarta', 'tercera', 'segunda', 'primera'];
const QUEENS_LEVELS = ['queens_e', 'queens_d', 'queens_c', 'queens_b', 'queens_a', 'queens_a', 'queens_libre'];

function levelToCategory(level: number, gender: Gender): string {
  const arr = gender === 'female' ? QUEENS_LEVELS : KING_LEVELS;
  return arr[Math.min(level - 1, arr.length - 1)]!;
}

const ALL_KINGS = ['libre', 'primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta', 'septima'];
const ALL_QUEENS = ['queens_libre', 'queens_a', 'queens_b', 'queens_c', 'queens_d', 'queens_e'];

export function CategoryQuiz() {
  const [gender, setGender] = useState<Gender>('male');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [chosen, setChosen] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === QUESTIONS.length;
  const score = Object.values(answers).reduce((a, b) => a + b, 0);
  const level = useMemo(() => scoreToLevel(score), [score]);
  const suggested = allAnswered ? levelToCategory(level, gender) : null;

  // Cuando el user cambia género y ya tenía categoría chosen, la migramos
  function onGenderChange(v: Gender) {
    setGender(v);
    if (chosen) {
      // Si chosen pertenece a queens y cambió a male, o viceversa, intentar mapear al equivalente
      const wasQueens = chosen.startsWith('queens_');
      const isQueensNow = v === 'female';
      if (wasQueens !== isQueensNow && allAnswered) {
        setChosen(levelToCategory(level, v));
      }
    }
  }

  const effectiveCategory = chosen ?? suggested ?? '';

  return (
    <div className="space-y-6">
      {/* Hidden inputs que ActionForm captura. (required no aplica a hidden;
          la categoría se valida server-side en updateProfile.) */}
      <input type="hidden" name="gender" value={gender} />
      <input type="hidden" name="skill_category" value={effectiveCategory} />

      {/* Género */}
      <div>
        <label className="text-foreground/85 mb-2 block text-sm font-medium">Género</label>
        <Select
          value={gender}
          onChange={(e) => onGenderChange(e.target.value as Gender)}
          required
        >
          <option value="male">Masculino</option>
          <option value="female">Femenino</option>
        </Select>
      </div>

      {/* Quiz */}
      <div className="border-border/40 bg-card/40 space-y-5 rounded-xl border p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="text-crown size-4" />
          <h3 className="font-display text-base tracking-tight">CALCULAMOS TU CATEGORÍA</h3>
        </div>
        <p className="text-muted-foreground -mt-2 text-xs normal-case">
          6 preguntas rápidas. Mejor que adivinar — y el organizador puede ajustarla en torneo.
        </p>

        {QUESTIONS.map((q, qi) => (
          <fieldset key={q.id}>
            <legend className="text-foreground/85 mb-2 block text-sm font-medium">
              <span className="text-muted-foreground tabular-nums mr-1 text-xs">{qi + 1}.</span>
              {q.label}
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {q.options.map((o, oi) => {
                const id = `${q.id}-${oi}`;
                const active = answers[q.id] === o.score;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      setAnswers((p) => ({ ...p, [q.id]: o.score }))
                    }
                    className={cn(
                      'border-border rounded-full border px-3 py-1.5 text-xs transition-colors',
                      active
                        ? 'border-crown/60 bg-crown/15 text-crown'
                        : 'text-muted-foreground hover:border-foreground/30 hover:text-foreground',
                    )}
                    aria-pressed={active}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}

        {/* Progress + sugerencia */}
        <div className="border-border/40 border-t pt-4">
          {allAnswered ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground uppercase tracking-widest">
                  Sugerencia
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {score}/{MAX_SCORE} pts
                </span>
              </div>
              <div className="border-crown/30 bg-crown/[0.06] flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
                <div>
                  <div className="text-muted-foreground text-[10px] uppercase tracking-widest">
                    Tu categoría tentativa
                  </div>
                  <div className="font-display text-crown mt-1 text-2xl tracking-tight">
                    {suggested && (CATEGORY_LABELS[suggested] ?? suggested)}
                  </div>
                  <div className="text-muted-foreground mt-1 text-[10px] normal-case">
                    Si dudas, mejor 1 banda más baja. El organizador la sube si te queda chica.
                  </div>
                </div>
                {chosen === suggested ? (
                  <span className="text-success flex items-center gap-1 text-xs font-semibold">
                    <Check className="size-3" />
                    Aplicada
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setChosen(suggested)}
                    className="bg-crown text-crown-foreground hover:brightness-110 rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-[filter]"
                  >
                    <Check className="mr-1 inline size-3" />
                    Aplicar sugerencia
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-xs">
              Llevas{' '}
              <span className="text-foreground font-semibold tabular-nums">
                {answeredCount}
              </span>
              /{QUESTIONS.length} preguntas. Termínalas para ver tu categoría sugerida.
            </div>
          )}
        </div>
      </div>

      {/* Override manual */}
      <div>
        <button
          type="button"
          onClick={() => setManualOpen((v) => !v)}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs uppercase tracking-widest"
        >
          <ChevronDown
            className={cn('size-3 transition-transform', manualOpen && 'rotate-180')}
          />
          {chosen
            ? `Ajustar manualmente (actual: ${CATEGORY_LABELS[chosen] ?? chosen})`
            : 'Prefiero elegir manualmente'}
        </button>
        {manualOpen && (
          <div className="mt-3">
            <Select
              value={chosen ?? ''}
              onChange={(e) => setChosen(e.target.value || null)}
            >
              <option value="">— elige tu categoría —</option>
              <optgroup label="Masculino / Mixto">
                {ALL_KINGS.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Femenino (Queens)">
                {ALL_QUEENS.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </optgroup>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
