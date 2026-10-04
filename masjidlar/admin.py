from django.contrib import admin

from .models import Masjid


@admin.action(description="Tanlanganlarni tasdiqlash")
def approve(modeladmin, request, queryset):
    queryset.update(is_approved=True)


@admin.action(description="Tasdiqni bekor qilish")
def unapprove(modeladmin, request, queryset):
    queryset.update(is_approved=False)


@admin.register(Masjid)
class MasjidAdmin(admin.ModelAdmin):
    list_display = ("name", "city", "address", "is_approved", "source", "created_at")
    list_filter = ("is_approved", "source", "women_section")
    list_editable = ("is_approved",)
    search_fields = ("name", "name_alt", "address", "city")
    actions = [approve, unapprove]
    readonly_fields = ("osm_id", "created_at")
    fieldsets = (
        (None, {"fields": ("name", "name_alt", "address", "city", "is_approved")}),
        ("Joylashuv", {"fields": ("latitude", "longitude")}),
        ("Qo'shimcha", {"fields": ("phone", "website", "opening_hours", "women_section", "description", "photo")}),
        ("Tizim", {"fields": ("source", "osm_id", "created_at")}),
    )
