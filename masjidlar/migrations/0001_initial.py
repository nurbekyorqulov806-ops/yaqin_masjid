from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Masjid",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=200, verbose_name="Nomi")),
                ("name_alt", models.CharField(blank=True, max_length=200, verbose_name="Boshqa nomi (kirill/rus)")),
                ("address", models.CharField(blank=True, max_length=255, verbose_name="Manzil")),
                ("city", models.CharField(blank=True, max_length=120, verbose_name="Shahar / tuman")),
                ("phone", models.CharField(blank=True, max_length=80, verbose_name="Telefon")),
                ("website", models.URLField(blank=True, verbose_name="Sayt")),
                ("opening_hours", models.CharField(blank=True, max_length=200, verbose_name="Ish vaqti")),
                ("description", models.TextField(blank=True, verbose_name="Tavsif")),
                ("photo", models.ImageField(blank=True, upload_to="masjid/", verbose_name="Rasm")),
                ("women_section", models.BooleanField(blank=True, null=True, verbose_name="Ayollar uchun joy bor")),
                ("latitude", models.FloatField(db_index=True, verbose_name="Kenglik (lat)")),
                ("longitude", models.FloatField(db_index=True, verbose_name="Uzunlik (lon)")),
                ("is_approved", models.BooleanField(default=True, verbose_name="Tasdiqlangan")),
                ("source", models.CharField(choices=[("osm", "OpenStreetMap"), ("user", "Foydalanuvchi taklifi"), ("admin", "Admin")], default="admin", max_length=10, verbose_name="Manba")),
                ("osm_id", models.CharField(blank=True, max_length=32, null=True, unique=True)),
                ("search_text", models.TextField(blank=True, editable=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "verbose_name": "masjid",
                "verbose_name_plural": "masjidlar",
                "ordering": ["name"],
                "indexes": [models.Index(fields=["is_approved", "latitude", "longitude"], name="masjid_approved_geo_idx")],
            },
        ),
    ]
