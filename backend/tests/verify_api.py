import asyncio
from api.search import _parse_params

def test_param_parsing():
    q = "Hose DN50 16 bar for solvent"
    params = _parse_params(q.upper() + " " + q)
    print(f"Parsed params for '{q}': {params}")
    assert params["dn"] == "50"
    assert params["bar"] == "16"

if __name__ == "__main__":
    test_param_parsing()
    print("Verification successful!")
