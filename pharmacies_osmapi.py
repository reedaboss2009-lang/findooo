import requests
import time
from datetime import datetime
from fastapi import FastAPI
import sqlalchemy as sa
from sqlalchemy.orm import sessionmaker, declarative_base
from apscheduler.schedulers.background import BackgroundScheduler

# -----------------------------
# Database Setup
# -----------------------------
DATABASE_URL = "sqlite:///pharmacies.db"
engine = sa.create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class Pharmacy(Base):
    _tablename_ = "pharmacies"
    id = sa.Column(sa.Integer, primary_key=True)
    osm_id = sa.Column(sa.String, unique=True, index=True)
    name = sa.Column(sa.String)
    address = sa.Column(sa.String)
    wilaya = sa.Column(sa.String)
    lat = sa.Column(sa.Float)
    lon = sa.Column(sa.Float)
    updated_at = sa.Column(sa.DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

# -----------------------------
# List of all 58 Wilayas (French names used by OSM)
# -----------------------------
WILAYAS = [
    "Adrar", "Chlef", "Laghouat", "Oum El Bouaghi", "Batna", "Béjaïa", "Biskra", "Béchar",
    "Blida", "Bouira", "Tamanrasset", "Tébessa", "Tlemcen", "Tiaret", "Tizi Ouzou", "Alger",
    "Djelfa", "Jijel", "Sétif", "Saïda", "Skikda", "Sidi Bel Abbès", "Annaba", "Guelma",
    "Constantine", "Médéa", "Mostaganem", "M'Sila", "Mascara", "Ouargla", "Oran", "El Bayadh",
    "Illizi", "Bordj Bou Arréridj", "Boumerdès", "El Tarf", "Tindouf", "Tissemsilt",
    "El Oued", "Khenchela", "Souk Ahras", "Tipaza", "Mila", "Aïn Defla", "Naâma",
    "Aïn Témouchent", "Ghardaïa", "Relizane", "Timimoun", "Bordj Badji Mokhtar", "Ouled Djellal",
    "Béni Abbès", "In Salah", "In Guezzam", "Touggourt", "Djanet", "El M’Ghair", "El Meniaa"
]

# -----------------------------
# Fetch pharmacies for one wilaya
# -----------------------------
def fetch_wilaya_pharmacies(wilaya_name):
    query = f'''
    [out:json][timeout:25];
    area["name"="{wilaya_name}"]["boundary"="administrative"];
    (
      node["amenity"="pharmacy"](area);
      way["amenity"="pharmacy"](area);
      relation["amenity"="pharmacy"](area);
    );
    out center;
    '''
    url = "https://overpass-api.de/api/interpreter"
    response = requests.post(url, data=query.encode("utf8"))
    response.raise_for_status()
    return response.json().get("elements", [])

# -----------------------------
# Update database for one wilaya
# -----------------------------
def update_wilaya(wilaya_name):
    print(f"Updating {wilaya_name}...")
    data = fetch_wilaya_pharmacies(wilaya_name)
    session = SessionLocal()

    for e in data:
        osm_id = str(e.get("id"))
        lat = e.get("lat") or e.get("center", {}).get("lat")
        lon = e.get("lon") or e.get("center", {}).get("lon")

        tags = e.get("tags", {})
        name = tags.get("name", "Pharmacie")
        address = tags.get("addr:street", "")

        obj = session.query(Pharmacy).filter(Pharmacy.osm_id == osm_id).first()

        if obj:
            obj.name = name
            obj.address = address
            obj.lat = lat
            obj.lon = lon
            obj.wilaya = wilaya_name
            obj.updated_at = datetime.utcnow()
        else:
            session.add(
                Pharmacy(
                    osm_id=osm_id,
                    name=name,
                    address=address,
                    wilaya=wilaya_name,
                    lat=lat,
                    lon=lon
                )
            )

    session.commit()
    session.close()
    time.sleep(1)

# -----------------------------
# Update all 58 wilayas
# -----------------------------
def update_all():
    print("Updating ALL wilayas...")
    for w in WILAYAS:
        update_wilaya(w)
    print("All data updated.")

# -----------------------------
# API
# -----------------------------
app = FastAPI()

@app.get("/api/pharmacies")
def get_pharmacies(wilaya: str = None, q: str = None, limit: int = 300):
    session = SessionLocal()
    query = session.query(Pharmacy)

    if wilaya:
        query = query.filter(Pharmacy.wilaya.ilike(f"%{wilaya}%"))

    if q:
        query = query.filter(Pharmacy.name.ilike(f"%{q}%"))

    results = query.limit(limit).all()
    session.close()

    return [
        {
            "osm_id": r.osm_id,
            "name": r.name,
            "address": r.address,
            "wilaya": r.wilaya,
            "lat": r.lat,
            "lon": r.lon
        }
        for r in results
    ]

# -----------------------------
# Scheduler (updates daily)
# -----------------------------
scheduler = BackgroundScheduler()
scheduler.add_job(update_all, "interval", days=1)
scheduler.start()

# -----------------------------
# Run once at startup
# -----------------------------
update_all()