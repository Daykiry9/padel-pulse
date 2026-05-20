# ADR-0002 — Ranking híbrido ELO + puntos absolutos

- **Fecha**: 2026-05-20
- **Estado**: aceptado

## Contexto

PadelKing necesita un sistema de ranking que sirva tres usos distintos:
1. **Match-by-match**: saber quién es mejor que quién para emparejar y sugerir cambios de categoría.
2. **Por período** (mensual, trimestral, semestral, anual): "el ranking del trimestre" es el premio que la comunidad pelea.
3. **Por scope** (interno de la comunidad, ciudad, nacional).

ELO clásico sirve para (1) pero es continuo — no tiene noción de "puntos del trimestre". ATP-style puntos absolutos sirve para (2) y (3) pero penaliza a quien juega pocos torneos por jugar bien. Ninguno solo cubre los tres.

## Decisión

**Sistema híbrido**:

**1. ELO continuo** (`packages/domain/src/ranking/elo.ts`)
- `teams.rating` se actualiza con cada match completado.
- K=32 base, multiplicado por `log(margin_of_victory + 1)` para amplificar victorias dominantes.
- Sirve para: emparejamiento, sugerencia de cambio de categoría, "fuerza técnica" del equipo.

**2. Puntos absolutos por torneo** (`packages/domain/src/ranking/points.ts`)
- Tabla ATP-style: `{1:1000, 2:600, 3:400, 4:250, 5-6:150, 7-8:100, 9+:25}`.
- Escala con `min(1, totalTeams/16)` — torneo chico vale menos.
- Multiplicador por formato: `americano=1.0, league=1.5, elimination=1.2, express=0.6`.
- Se persisten en tabla `team_points` con `awarded_at` para filtros temporales.

**3. Decaimiento temporal lineal**
- Puntos pesan 100% el día que se otorgan, decaen linealmente hasta 0 en 12 meses.
- Sirve para: keep-fresh ranking, evitar que campeones de hace 3 años dominen siempre.
- Implementado en SQL (vista `team_ranking_live`) y replicado en TS (`decayedPoints` para previews y tests).

**4. Ranking de comunidad = suma top-5 equipos** (`community_ranking_live`)
- Evita que comunidad grande con 100 jugadores promedio supere a comunidad pequeña con 5 élite.
- Configurable con `topN`, default 5.

## Alternativas consideradas

| Opción | Por qué se descartó |
|---|---|
| **Solo ELO** | No permite naturalmente "ranking del trimestre" — ELO es continuo, no acumulable. Premio del período sería arbitrario. |
| **Solo puntos absolutos** | Penaliza a equipos que juegan pocos torneos por calidad. ATP requiere que un nº 1 juegue ~20 torneos al año — PadelKing tiene jugadores amateur que juegan 4-6. |
| **Glicko-2** | Más sofisticado que ELO pero más opaco para el usuario. ELO simple + puntos visibles le permite a un jugador entender por qué subió o bajó. |
| **Top-N variable** | Probar con N=3, N=10. Por ahora N=5 da equilibrio entre élite y volumen. Revisitar con datos. |

## Consecuencias

**Positivas**
- Cada uno de los 3 usos del ranking se resuelve con la herramienta correcta.
- Las vistas SQL hacen el cálculo pesado en el servidor; el cliente solo lee.
- Lógica replicada en TS permite previews offline y tests sin DB.

**Negativas**
- Dos sistemas a explicar al usuario. Mitigación: la UI muestra ambos por separado ("ELO" y "Puntos").
- Decaimiento lineal puede causar UX confusa cuando un equipo ve sus puntos bajar sin jugar. Mitigación: ranking del período (cerrado al final del mes/trimestre) además del live.
- Tunear pesos requerirá iteración con datos reales.

## Revisitar si

- Después de los primeros 3 torneos finalizados con datos reales, calibrar `POSITION_POINTS`, `FORMAT_MULTIPLIER` y `topN`.
- Si la fricción de "no entiendo por qué bajé" es alta, considerar ranking "instantáneo" vs "del período" más separados en la UI.
