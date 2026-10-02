from app.schemas import RiskComputeRequest, RiskComputeResponse

# Pesos del modelo de Risk Score (0-100, cuanto más alto, mayor riesgo)
W_PHISHING = 0.40
W_TRAINING = 0.25
W_QUIZ = 0.25
W_RECENCY = 0.10
RECENCY_HORIZON_DAYS = 90


def compute_risk_score(req: RiskComputeRequest) -> RiskComputeResponse:
    recency_factor = min(req.days_since_last_activity / RECENCY_HORIZON_DAYS, 1.0)

    phishing_component = W_PHISHING * req.phishing_click_rate
    training_component = W_TRAINING * (1 - req.training_completion_rate)
    quiz_component = W_QUIZ * (1 - req.quiz_avg_score / 100)
    recency_component = W_RECENCY * recency_factor

    raw_score = phishing_component + training_component + quiz_component + recency_component
    score = round(raw_score * 100)
    score = max(0, min(100, score))

    if score < 25:
        risk_level = "BAJO"
    elif score < 50:
        risk_level = "MEDIO"
    elif score < 75:
        risk_level = "ALTO"
    else:
        risk_level = "CRITICO"

    breakdown = {
        "phishing": round(phishing_component * 100, 1),
        "formacion": round(training_component * 100, 1),
        "evaluaciones": round(quiz_component * 100, 1),
        "inactividad": round(recency_component * 100, 1),
    }

    return RiskComputeResponse(score=score, risk_level=risk_level, breakdown=breakdown)
