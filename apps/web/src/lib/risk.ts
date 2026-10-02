export type RiskLevel = "BAJO" | "MEDIO" | "ALTO" | "CRITICO";

export const RISK_LEVEL_META: Record<
  RiskLevel,
  { label: string; variant: "good" | "warning" | "serious" | "critical"; hex: string }
> = {
  BAJO: { label: "Riesgo bajo", variant: "good", hex: "#0ca30c" },
  MEDIO: { label: "Riesgo medio", variant: "warning", hex: "#fab219" },
  ALTO: { label: "Riesgo alto", variant: "serious", hex: "#ec835a" },
  CRITICO: { label: "Riesgo crítico", variant: "critical", hex: "#d03b3b" },
};

export function riskLevelFromScore(score: number): RiskLevel {
  if (score < 25) return "BAJO";
  if (score < 50) return "MEDIO";
  if (score < 75) return "ALTO";
  return "CRITICO";
}
