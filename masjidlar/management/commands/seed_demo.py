"""Internet bo'lmaganda ham sayt ishlashini ko'rish uchun bir nechta demo masjid.
Koordinatalar taxminiy. Haqiqiy ma'lumot uchun: python manage.py import_osm"""
from django.core.management.base import BaseCommand

from masjidlar.models import Masjid

DEMO = [
    ("Hazrati Imom masjidi", "Toshkent", 41.3392, 69.2297),
    ("Bibi-Xonim masjidi", "Samarqand", 39.6604, 66.9755),
    ("Kalon masjidi", "Buxoro", 39.7757, 64.4140),
    ("Bolo-Hovuz masjidi", "Buxoro", 39.7748, 64.4097),
    ("Juma masjidi", "Xiva", 41.3787, 60.3593),
    ("Jome masjidi", "Qo'qon", 40.5286, 70.9429),
]


class Command(BaseCommand):
    help = "Demo masjidlarni qo'shadi"

    def handle(self, *args, **opts):
        n = 0
        for name, city, lat, lon in DEMO:
            _, made = Masjid.objects.get_or_create(
                name=name, city=city,
                defaults={"latitude": lat, "longitude": lon, "source": "admin",
                          "description": "Demo ma'lumot, koordinatalar taxminiy."},
            )
            n += made
        self.stdout.write(self.style.SUCCESS(f"{n} ta demo masjid qo'shildi."))
