from django.db import models
from django.urls import reverse

from .utils import cyr_to_lat, has_cyrillic, normalize_search


class Masjid(models.Model):
    SOURCES = [
        ("osm", "OpenStreetMap"),
        ("user", "Foydalanuvchi taklifi"),
        ("admin", "Admin"),
    ]

    name = models.CharField("Nomi", max_length=200)
    name_alt = models.CharField("Boshqa nomi (kirill/rus)", max_length=200, blank=True)
    address = models.CharField("Manzil", max_length=255, blank=True)
    city = models.CharField("Shahar / tuman", max_length=120, blank=True)
    phone = models.CharField("Telefon", max_length=80, blank=True)
    website = models.URLField("Sayt", blank=True)
    opening_hours = models.CharField("Ish vaqti", max_length=200, blank=True)
    description = models.TextField("Tavsif", blank=True)
    photo = models.ImageField("Rasm", upload_to="masjid/", blank=True)
    women_section = models.BooleanField("Ayollar uchun joy bor", null=True, blank=True)

    latitude = models.FloatField("Kenglik (lat)", db_index=True)
    longitude = models.FloatField("Uzunlik (lon)", db_index=True)

    is_approved = models.BooleanField("Tasdiqlangan", default=True)
    source = models.CharField("Manba", max_length=10, choices=SOURCES, default="admin")
    osm_id = models.CharField(max_length=32, unique=True, null=True, blank=True)
    search_text = models.TextField(editable=False, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "masjid"
        verbose_name_plural = "masjidlar"
        ordering = ["name"]
        indexes = [models.Index(fields=["is_approved", "latitude", "longitude"], name="masjid_approved_geo_idx")]

    def __str__(self):
        return f"{self.name} ({self.city})" if self.city else self.name

    def get_absolute_url(self):
        return reverse("detail", args=[self.pk])

    def save(self, *args, **kwargs):
        if has_cyrillic(self.name):
            if not self.name_alt:
                self.name_alt = self.name
            self.name = cyr_to_lat(self.name)
        if not self.osm_id:
            self.osm_id = None
        self.search_text = normalize_search(
            " ".join([self.name, self.name_alt, self.city, self.address])
        )
        super().save(*args, **kwargs)
