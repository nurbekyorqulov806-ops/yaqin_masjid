"""
O'zbekistondagi barcha masjidlarni OpenStreetMap (Overpass API) dan import qiladi.

    python manage.py import_osm                 # internetdan yuklaydi
    python manage.py import_osm --file osm.json # oldindan saqlangan faylni o'qiydi

Qayta ishga tushirsangiz, mavjud yozuvlar yangilanadi (dublikat bo'lmaydi).
Admin panelda qo'lda o'zgartirilgan (source != osm) yozuvlarga tegilmaydi.
"""
import json
import time
import urllib.parse
import urllib.request

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from masjidlar.models import Masjid

QUERY = """
[out:json][timeout:300];
area["ISO3166-1"="UZ"][admin_level=2]->.uz;
(
  nwr["amenity"="place_of_worship"]["religion"="muslim"](area.uz);
  nwr["building"="mosque"](area.uz);
);
out center tags;
"""

ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]


def download():
    body = urllib.parse.urlencode({"data": QUERY}).encode()
    last = None
    for url in ENDPOINTS:
        for attempt in range(2):
            try:
                req = urllib.request.Request(
                    url, data=body, headers={"User-Agent": "YaqinMasjid/1.0 (django import)"}
                )
                with urllib.request.urlopen(req, timeout=330) as resp:
                    return json.load(resp)
            except Exception as exc:  # noqa: BLE001
                last = exc
                time.sleep(5)
    raise CommandError(f"Overpass'ga ulanib bo'lmadi: {last}")


def pick(tags, *keys):
    for k in keys:
        v = tags.get(k)
        if v:
            return v.strip()
    return ""


class Command(BaseCommand):
    help = "O'zbekiston masjidlarini OpenStreetMap'dan import qiladi"

    def add_arguments(self, parser):
        parser.add_argument("--file", help="Overpass JSON faylidan o'qish")

    def handle(self, *args, **opts):
        if opts["file"]:
            with open(opts["file"], encoding="utf-8") as f:
                data = json.load(f)
        else:
            self.stdout.write("Overpass'dan yuklanmoqda (1-3 daqiqa ketishi mumkin)...")
            data = download()

        elements = data.get("elements", [])
        self.stdout.write(f"{len(elements)} ta element topildi. Bazaga yozilmoqda...")
        created = updated = skipped = 0

        with transaction.atomic():
            for el in elements:
                lat = el.get("lat") or (el.get("center") or {}).get("lat")
                lon = el.get("lon") or (el.get("center") or {}).get("lon")
                if lat is None or lon is None:
                    skipped += 1
                    continue
                tags = el.get("tags", {})
                osm_id = f'{el["type"]}/{el["id"]}'

                name = pick(tags, "name:uz", "name:uz-Latn", "name", "name:ru", "name:en") or "Nomsiz masjid"
                alt = pick(tags, "name:uz-Cyrl", "name:ru")
                street = pick(tags, "addr:street")
                house = pick(tags, "addr:housenumber")
                values = {
                    "name": name[:200],
                    "name_alt": alt[:200],
                    "address": " ".join(x for x in (street, house) if x)[:255],
                    "city": pick(tags, "addr:city", "addr:town", "addr:village", "addr:suburb", "addr:district")[:120],
                    "phone": pick(tags, "phone", "contact:phone")[:80],
                    "website": pick(tags, "website", "contact:website")[:200],
                    "opening_hours": pick(tags, "opening_hours")[:200],
                    "latitude": float(lat),
                    "longitude": float(lon),
                }

                obj = Masjid.objects.filter(osm_id=osm_id).first()
                if obj is None:
                    Masjid(osm_id=osm_id, source="osm", is_approved=True, **values).save()
                    created += 1
                elif obj.source == "osm":
                    for k, v in values.items():
                        setattr(obj, k, v)
                    obj.save()
                    updated += 1
                else:
                    skipped += 1

        self.stdout.write(self.style.SUCCESS(
            f"Tayyor: {created} ta yangi, {updated} ta yangilandi, {skipped} ta o'tkazib yuborildi."
        ))
