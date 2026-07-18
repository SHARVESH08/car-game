from ml.config import parse_class_name


def test_single_word_make():
    r = parse_class_name("Ferrari 458 Italia Coupe 2012")
    assert r == {"name": "Ferrari 458 Italia Coupe 2012", "make": "Ferrari",
                 "model": "458 Italia Coupe", "year": 2012}


def test_multi_word_makes():
    assert parse_class_name("AM General Hummer SUV 2000")["make"] == "AM General"
    assert parse_class_name("Aston Martin V8 Vantage Convertible 2012")["make"] == "Aston Martin"
    assert parse_class_name("Land Rover Range Rover SUV 2012")["make"] == "Land Rover"


def test_multi_word_model_kept_intact():
    r = parse_class_name("Aston Martin V8 Vantage Convertible 2012")
    assert r["model"] == "V8 Vantage Convertible"
    assert r["year"] == 2012


def test_hyphenated_and_lowercase_makes():
    assert parse_class_name("Rolls-Royce Phantom Sedan 2012")["make"] == "Rolls-Royce"
    assert parse_class_name("smart fortwo Convertible 2012")["make"] == "smart"


def test_model_with_slash():
    r = parse_class_name("Ram C/V Cargo Van Minivan 2012")
    assert r["make"] == "Ram"
    assert r["model"] == "C/V Cargo Van Minivan"
