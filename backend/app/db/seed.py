from typing import List
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.db.models.station import Station
from app.db.models.user import User

settings = get_settings()

DEMO_STATIONS = [
    {
        'title': 'Verma Villa Green Spot',
        'location': 'Koregaon Park, Pune',
        'rating': 4.8,
        'review_count': 34,
        'price_per_hour': 150,
        'status': 'AVAILABLE',
        'image': 'https://picsum.photos/400/300?random=1',
        'connector_type': 'Type 2',
        'power_output': '7.2kW',
        'description': 'Secure driveway charger. Covered parking available while charging. Near German Bakery.',
        'lat': 18.5362,
        'lng': 73.8940,
        'phone_number': '+919876543210',
        'monthly_earnings': 3200
    },
    {
        'title': 'TechPark Quick Charge',
        'location': 'Hinjewadi Phase 1, Pune',
        'rating': 4.5,
        'review_count': 120,
        'price_per_hour': 200,
        'status': 'BUSY',
        'image': 'https://picsum.photos/400/300?random=2',
        'connector_type': 'CCS2',
        'power_output': '22kW',
        'description': 'Fast DC charging near Wipro Circle. 24/7 access for IT park employees.',
        'lat': 18.5913,
        'lng': 73.7389,
        'phone_number': '+919876543211',
        'monthly_earnings': 4100
    },
    {
        'title': 'Baner High Street Point',
        'location': 'Baner, Pune',
        'rating': 4.9,
        'review_count': 12,
        'price_per_hour': 120,
        'status': 'AVAILABLE',
        'image': 'https://picsum.photos/400/300?random=3',
        'connector_type': 'Type 2',
        'power_output': '3.3kW',
        'description': 'Slow charging perfect for evening visits to High Street restaurants.',
        'lat': 18.5590,
        'lng': 73.7868,
        'phone_number': '+919876543212',
        'monthly_earnings': 2100
    },
    {
        'title': 'FC Road Rapid Point',
        'location': 'FC Road, Pune',
        'rating': 4.2,
        'review_count': 8,
        'price_per_hour': 250,
        'status': 'OFFLINE',
        'image': 'https://picsum.photos/400/300?random=4',
        'connector_type': 'Type 2',
        'power_output': '11kW',
        'description': 'Centrally located near Fergusson College. Currently maintenance in progress.',
        'lat': 18.5196,
        'lng': 73.8433,
        'phone_number': '+919876543213',
        'monthly_earnings': 0
    },
    {
        'title': 'Viman Nagar EV Hub',
        'location': 'Viman Nagar, Pune',
        'rating': 4.7,
        'review_count': 45,
        'price_per_hour': 180,
        'status': 'AVAILABLE',
        'image': 'https://picsum.photos/400/300?random=5',
        'connector_type': 'CCS2',
        'power_output': '25kW',
        'description': 'High speed charger near Pune Airport. Lounge access available while charging.',
        'lat': 18.5679,
        'lng': 73.9143,
        'phone_number': '+919876543214',
        'monthly_earnings': 3050
    }
]


def ensure_demo_stations_for_host(db: Session, host: User) -> List[Station]:
    if not settings.seed_demo_data:
        return []

    existing = db.query(Station).filter(Station.host_id == host.id).first()
    if existing:
        return []

    stations = []
    for payload in DEMO_STATIONS:
        station = Station(
            host_id=host.id,
            host_name=host.username,
            **payload
        )
        db.add(station)
        stations.append(station)

    db.commit()
    return stations
