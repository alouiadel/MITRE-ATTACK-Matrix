import json
import pickle
import os
from hashlib import md5

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
LAYER_FILE = os.path.join(DATA_DIR, "mitre_matrix_financial_sector.json")
LOOKUP_FILE = os.path.join(DATA_DIR, "technique_lookup.json")
OUTPUT_JSON = os.path.join(DATA_DIR, "app_data.json")
OUTPUT_PKL = os.path.join(DATA_DIR, "app_data.pkl")
HASH_FILE = os.path.join(DATA_DIR, ".preprocess_hash")


def file_hash(path):
    with open(path, "rb") as f:
        return md5(f.read()).hexdigest()


def needs_rebuild():
    if not os.path.exists(OUTPUT_JSON) or not os.path.exists(OUTPUT_PKL):
        return True
    if not os.path.exists(HASH_FILE):
        return True
    with open(HASH_FILE) as f:
        saved = f.read().strip()
    current = file_hash(LAYER_FILE) + file_hash(LOOKUP_FILE)
    return current != saved


def run():
    if not needs_rebuild():
        return

    with open(LAYER_FILE) as f:
        layer = json.load(f)

    with open(LOOKUP_FILE) as f:
        lookup = json.load(f)

    for t in layer["techniques"]:
        info = lookup.get(t["techniqueID"], {})
        t["name"] = info.get("name", "")
        t["description"] = info.get("description", "")

    with open(OUTPUT_JSON, "w") as f:
        json.dump(layer, f, separators=(",", ":"))

    with open(OUTPUT_PKL, "wb") as f:
        pickle.dump(layer, f, protocol=pickle.HIGHEST_PROTOCOL)

    # Write hash only after successful writes
    with open(HASH_FILE, "w") as f:
        f.write(file_hash(LAYER_FILE) + file_hash(LOOKUP_FILE))

    json_size = os.path.getsize(OUTPUT_JSON)
    pkl_size = os.path.getsize(OUTPUT_PKL)
    print(
        f"  preprocessed: {os.path.getsize(LAYER_FILE) // 1024}K + {os.path.getsize(LOOKUP_FILE) // 1024}K"
        f" -> {json_size // 1024}K JSON, {pkl_size // 1024}K pickle"
    )


if __name__ == "__main__":
    run()
