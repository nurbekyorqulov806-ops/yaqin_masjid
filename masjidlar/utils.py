import math
import re

_CYR = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "yo",
    "ж": "j", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m",
    "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
    "ф": "f", "х": "x", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "shch",
    "ъ": "ʼ", "ы": "i", "ь": "", "э": "e", "ю": "yu", "я": "ya",
    "ў": "oʻ", "қ": "q", "ғ": "gʻ", "ҳ": "h",
}
_CYR_RE = re.compile("[А-Яа-яЁёЎўҚқҒғҲҳ]")
_APOS_RE = re.compile("[ʻʼ'`’‘ʹ]")


def has_cyrillic(text):
    return bool(_CYR_RE.search(text or ""))


def cyr_to_lat(text):
    """Kirill yozuvidagi o'zbekcha matnni lotinga o'giradi."""
    out = []
    for ch in text or "":
        low = ch.lower()
        if low in _CYR:
            lat = _CYR[low]
            out.append(lat.capitalize() if ch != low else lat)
        else:
            out.append(ch)
    return "".join(out)


def normalize_search(text):
    """Qidiruv uchun: kichik harf, lotin, apostrofsiz (o'zbek -> ozbek)."""
    return _APOS_RE.sub("", cyr_to_lat(text or "").lower()).strip()


def haversine_m(lat1, lon1, lat2, lon2):
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = p2 - p1
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def bbox_for(lat, lon, radius_m):
    dlat = radius_m / 111320.0
    dlon = radius_m / (111320.0 * max(math.cos(math.radians(lat)), 0.01))
    return lat - dlat, lat + dlat, lon - dlon, lon + dlon
