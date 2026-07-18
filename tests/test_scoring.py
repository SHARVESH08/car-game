from api.scoring import match_level, score_ai, score_human

TRUTH = {"name": "Ferrari 458 Italia Coupe 2012", "make": "Ferrari",
         "model": "458 Italia Coupe", "year": 2012}


def test_exact_model():
    s = score_human(TRUTH, "Ferrari", "458 Italia Coupe")
    assert s == {"level": "model", "points": 100}


def test_make_only_partial_credit():
    s = score_human(TRUTH, "Ferrari", "California Convertible")
    assert s == {"level": "make", "points": 40}


def test_wrong_make_scores_zero_even_if_model_matches():
    s = score_human(TRUTH, "Lamborghini", "458 Italia Coupe")
    assert s == {"level": "wrong", "points": 0}


def test_case_and_whitespace_insensitive():
    assert match_level(TRUTH, "  ferrari ", "458 ITALIA COUPE") == "model"


def test_mode_multipliers():
    assert score_human(TRUTH, "Ferrari", "458 Italia Coupe", mode="silhouette")["points"] == 150
    assert score_human(TRUTH, "Ferrari", "458 Italia Coupe", mode="speed")["points"] == 200
    assert score_human(TRUTH, "Ferrari", None, mode="detail")["points"] == 60


def test_streak_bonus_caps_at_50():
    assert score_human(TRUTH, "Ferrari", "458 Italia Coupe", streak=3)["points"] == 130
    assert score_human(TRUTH, "Ferrari", "458 Italia Coupe", streak=99)["points"] == 150


def test_no_streak_bonus_on_wrong_answer():
    assert score_human(TRUTH, "Lada", None, streak=5)["points"] == 0


def test_timed_out_scores_zero():
    s = score_human(TRUTH, "Ferrari", "458 Italia Coupe", timed_out=True)
    assert s == {"level": "wrong", "points": 0}


def test_ai_scoring_no_multiplier():
    assert score_ai(TRUTH, {"make": "Ferrari", "model": "458 Italia Coupe"})["points"] == 100
    assert score_ai(TRUTH, {"make": "Ferrari", "model": "FF Coupe"})["points"] == 40
    assert score_ai(TRUTH, {"make": "BMW", "model": "M3 Coupe"})["points"] == 0
