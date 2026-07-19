"""Round scoring. Pure functions — the frontend only displays.

Human: exact model = 100 base, make-only = 40 base, wrong = 0.
Mode multipliers compensate for handicapped views (the AI always sees the
full image). Streak bonus caps at +50.
AI: same base from its top-1, no multipliers, no streaks.
"""

MODE_MULTIPLIER = {"classic": 1.0, "silhouette": 1.5, "detail": 1.5, "speed": 2.0, "upload": 1.0}


def _norm(s: str | None) -> str:
    return (s or "").strip().casefold()


def free_text_level(truth: dict, answer: str | None) -> str:
    """VehicleIQ's generous free-text rule: the typed answer counts if it
    contains the make or the model (case-insensitive)."""
    a = _norm(answer)
    if not a:
        return "wrong"
    if _norm(truth["model"]) in a:
        return "model"
    if _norm(truth["make"]) in a:
        return "make"
    return "wrong"


def build_hints(truth: dict) -> list[str]:
    """Progressive hints that tease without naming the car."""
    model_words = truth["model"].split()
    body = model_words[-1] if len(model_words) > 1 else None
    hints = [f"Made in {truth['year']}"]
    if body and body.lower() not in ("edition",):
        hints.append(f"Body style: {body}")
    hints.append(f"Make starts with '{truth['make'][0].upper()}'")
    return hints


def match_level(truth: dict, guess_make: str | None, guess_model: str | None) -> str:
    """'model' | 'make' | 'wrong'. truth has keys make, model."""
    if _norm(guess_make) != _norm(truth["make"]):
        return "wrong"
    if _norm(guess_model) == _norm(truth["model"]):
        return "model"
    return "make"


def score_human(truth: dict, guess_make: str | None, guess_model: str | None,
                mode: str = "classic", streak: int = 0, timed_out: bool = False) -> dict:
    level = "wrong" if timed_out else match_level(truth, guess_make, guess_model)
    base = {"model": 100, "make": 40, "wrong": 0}[level]
    mult = MODE_MULTIPLIER.get(mode, 1.0)
    bonus = 10 * min(max(streak, 0), 5) if base > 0 else 0
    return {"level": level, "points": round(base * mult) + bonus}


def score_ai(truth: dict, ai_top1: dict) -> dict:
    level = match_level(truth, ai_top1.get("make"), ai_top1.get("model"))
    base = {"model": 100, "make": 40, "wrong": 0}[level]
    return {"level": level, "points": base}
