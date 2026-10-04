from django.contrib import messages
from django.core.cache import cache
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.cache import cache_page
from django.views.decorators.http import require_GET

from .forms import MasjidSuggestForm
from .models import Masjid
from .utils import bbox_for, haversine_m, normalize_search


def home(request):
    return render(request, "masjidlar/home.html", {"total": Masjid.objects.filter(is_approved=True).count()})


def detail(request, pk):
    masjid = get_object_or_404(Masjid, pk=pk, is_approved=True)
    return render(request, "masjidlar/detail.html", {"m": masjid})


def add(request):
    if request.method == "POST":
        form = MasjidSuggestForm(request.POST)
        if form.is_valid():
            if form.cleaned_data.get("url_check"):  # bot
                return redirect("add")
            ip = request.META.get("REMOTE_ADDR", "?")
            key = f"add:{ip}"
            count = cache.get(key, 0)
            if count >= 5:
                form.add_error(None, "Juda ko'p taklif yubordingiz. Birozdan keyin urinib ko'ring.")
            else:
                cache.set(key, count + 1, 3600)
                obj = form.save(commit=False)
                obj.is_approved = False
                obj.source = "user"
                obj.save()
                messages.success(request, "Rahmat! Taklifingiz tekshiruvdan so'ng xaritada paydo bo'ladi.")
                return redirect("add")
    else:
        form = MasjidSuggestForm()
    return render(request, "masjidlar/add.html", {"form": form})


def _ser(m, distance=None):
    data = {
        "id": m.pk,
        "name": m.name,
        "city": m.city,
        "address": m.address,
        "lat": m.latitude,
        "lon": m.longitude,
        "women": m.women_section,
    }
    if distance is not None:
        data["distance_m"] = round(distance)
    return data


def _float(request, key):
    try:
        return float(request.GET[key])
    except (KeyError, ValueError):
        return None


@cache_page(60 * 10)
@require_GET
def api_all(request):
    """Barcha masjidlar ixcham ko'rinishda: [id, lat, lon, nomi, shahar]."""
    rows = Masjid.objects.filter(is_approved=True).values_list("id", "latitude", "longitude", "name", "city")
    return JsonResponse({"items": [[i, round(la, 5), round(lo, 5), n, c] for i, la, lo, n, c in rows]})


@require_GET
def api_nearby(request):
    lat, lon = _float(request, "lat"), _float(request, "lon")
    if lat is None or lon is None or not (-90 <= lat <= 90 and -180 <= lon <= 180):
        return JsonResponse({"error": "lat va lon kerak"}, status=400)
    try:
        limit = max(1, min(int(request.GET.get("limit", 20)), 50))
    except ValueError:
        limit = 20

    found = {}
    for radius in (1500, 4000, 10000, 30000, 100000, 500000):
        min_lat, max_lat, min_lon, max_lon = bbox_for(lat, lon, radius)
        qs = Masjid.objects.filter(
            is_approved=True,
            latitude__range=(min_lat, max_lat),
            longitude__range=(min_lon, max_lon),
        )
        found = {}
        for m in qs:
            d = haversine_m(lat, lon, m.latitude, m.longitude)
            if d <= radius:
                found[m.pk] = (d, m)
        if len(found) >= limit:
            break

    ordered = sorted(found.values(), key=lambda x: x[0])[:limit]
    return JsonResponse({"items": [_ser(m, d) for d, m in ordered]})


@require_GET
def api_search(request):
    q = normalize_search(request.GET.get("q", ""))
    if len(q) < 2:
        return JsonResponse({"items": []})
    qs = Masjid.objects.filter(is_approved=True, search_text__contains=q).order_by("name")[:20]
    return JsonResponse({"items": [_ser(m) for m in qs]})
