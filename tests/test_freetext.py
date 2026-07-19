from api.scoring import build_hints, free_text_level

TRUTH = {"name": "Ferrari 458 Italia Coupe 2012", "make": "Ferrari",
         "model": "458 Italia Coupe", "year": 2012}


def test_full_model_in_answer():
    assert free_text_level(TRUTH, "ferrari 458 italia coupe") == "model"


def test_make_only():
    assert free_text_level(TRUTH, "some kind of Ferrari") == "make"


def test_wrong_and_empty():
    assert free_text_level(TRUTH, "lamborghini gallardo") == "wrong"
    assert free_text_level(TRUTH, "") == "wrong"
    assert free_text_level(TRUTH, None) == "wrong"


def test_hints_never_leak_the_name():
    hints = build_hints(TRUTH)
    assert len(hints) >= 2
    joined = " ".join(hints).lower()
    assert "ferrari" not in joined
    assert "458" not in joined
    assert "2012" in joined  # year hint is intentional


def test_hints_body_style_and_initial():
    hints = build_hints(TRUTH)
    assert "Body style: Coupe" in hints
    assert "Make starts with 'F'" in hints
