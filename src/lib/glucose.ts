export const moments = { FASTING:"En ayunas", AFTER_LUNCH:"2 horas después del almuerzo", BEFORE_DINNER:"Antes de cenar" } as const;
export type Moment = keyof typeof moments;
export function classify(value: number, moment: Moment) {
  if (value < 4) return "low" as const;
  const high = moment === "AFTER_LUNCH" ? 8.5 : 7;
  return value > high || (moment === "AFTER_LUNCH" && value >= 8.5) ? "high" as const : "in" as const;
}
export const statusLabel = (v: number, m: Moment) => ({low:"Hipoglucemia",high:"Por encima del objetivo",in:"Dentro del objetivo"}[classify(v,m)]);
