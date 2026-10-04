# Yaqin Masjid

O'zbekiston masjidlari xaritasi: joylashuvni yoqib eng yaqin masjidni ko'rish, qidiruv,
namoz vaqtlari, qibla kompasi, saqlanganlar, yangi masjid taklif qilish, qorong'i rejim.
Django + Leaflet (OpenStreetMap), API kalit kerak emas.

## Ishga tushirish

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

python manage.py migrate
python manage.py createsuperuser
python manage.py import_osm     # O'zbekiston masjidlarini yuklaydi (1-3 daqiqa)
python manage.py runserver
```

Brauzerda: http://127.0.0.1:8000  (admin: /admin/)

Internet sekin bo'lsa yoki sinab ko'rmoqchi bo'lsangiz: `python manage.py seed_demo`
(6 ta demo masjid, koordinatalari taxminiy).

`import_osm` ni istalgan vaqt qayta ishga tushirsangiz bo'ladi: yangilari qo'shiladi,
eskilari yangilanadi, dublikat bo'lmaydi. Admin panelda qo'lda tahrirlangan yozuvlarga tegilmaydi.

## Muhim

- **Joylashuv (geolocation)** brauzerda faqat `https://` yoki `localhost` da ishlaydi.
  Serverga chiqarganda HTTPS yoqing.
- Foydalanuvchilar taklif qilgan masjidlar **tasdiqlanmaguncha** xaritada ko'rinmaydi:
  admin panelda "Masjidlar" ro'yxatida tasdiqlang (ro'yxatning o'zida katakcha bor).
- Xaritadagi ro'yxat 10 daqiqa keshlanadi, yangi tasdiqlangan masjid birozdan keyin chiqadi.
- Namoz vaqtlari Aladhan API'dan olinadi (`static/masjidlar/js/common.js` ichida `YM.PRAYER`:
  hisoblash usuli va Hanafiy asr). O'zbekiston Musulmonlar idorasi taqvimi bilan 1-3 daqiqa farq bo'lishi mumkin.
- Xarita plitkalari CARTO/OpenStreetMap. Foydalanuvchilar juda ko'payganda MapTiler yoki Stadia kabi
  xizmatga o'ting (`YM.tileUrl` funksiyasini o'zgartirasiz).

## Serverga chiqarish (Render, Railway, VPS)

```bash
export DEBUG=0
export SECRET_KEY="uzun-tasodifiy-satr"
export ALLOWED_HOSTS="sizningsayt.uz"
export CSRF_TRUSTED_ORIGINS="https://sizningsayt.uz"
python manage.py collectstatic --noinput
gunicorn config.wsgi
```

SQLite o'rniga PostgreSQL ishlatmoqchi bo'lsangiz, `config/settings.py` dagi `DATABASES` ni almashtiring.
Yuklangan rasmlar (`media/`) uchun doimiy disk yoki S3 kerak.

## Tuzilma

```
config/                  sozlamalar, asosiy URL
masjidlar/
  models.py              Masjid modeli (kirill -> lotin, qidiruv matni)
  views.py               sahifalar va JSON API (/api/masjidlar/, /api/yaqin/, /api/qidiruv/)
  management/commands/   import_osm, seed_demo
  templates/masjidlar/   home, detail, add
  static/masjidlar/      css/app.css, js/ (home, detail, add, common)
```

## Keyingi g'oyalar

Viloyat bo'yicha filtr, "juma namozi vaqti" maydoni, masjidga rasm yuklash (foydalanuvchi),
imomlar va e'lonlar, Telegram bot (joylashuv yuborsa eng yaqin masjidni qaytaradi).
