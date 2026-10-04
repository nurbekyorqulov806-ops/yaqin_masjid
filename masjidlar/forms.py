from django import forms

from .models import Masjid


class MasjidSuggestForm(forms.ModelForm):
    # Spam uchun yashirin tuzoq: odam to'ldirmaydi
    url_check = forms.CharField(required=False, widget=forms.HiddenInput)

    class Meta:
        model = Masjid
        fields = [
            "name", "address", "city", "phone", "opening_hours",
            "women_section", "description", "latitude", "longitude",
        ]
        widgets = {
            "latitude": forms.HiddenInput,
            "longitude": forms.HiddenInput,
            "description": forms.Textarea(attrs={"rows": 3}),
            "name": forms.TextInput(attrs={"placeholder": "Masalan: Hazrati Imom masjidi"}),
            "address": forms.TextInput(attrs={"placeholder": "Ko'cha, mahalla, mo'ljal"}),
        }

    def clean_latitude(self):
        v = self.cleaned_data["latitude"]
        if not 36.5 <= v <= 46.0:
            raise forms.ValidationError("Joylashuv O'zbekiston hududida bo'lishi kerak.")
        return v

    def clean_longitude(self):
        v = self.cleaned_data["longitude"]
        if not 55.0 <= v <= 74.0:
            raise forms.ValidationError("Joylashuv O'zbekiston hududida bo'lishi kerak.")
        return v
