import json
import os

DATA_FILE = "data/stations.json"

def read_db():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []

def write_db(data):
    # Ensure directory exists
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)

def add_station_to_db(station_data):
    db = read_db()
    db.append(station_data)
    write_db(db)
    return station_data