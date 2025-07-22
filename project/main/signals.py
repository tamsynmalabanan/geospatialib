from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.postgres.search import SearchVector

from .models import Layer

@receiver(post_save, sender=Layer)
def update_search_vector(sender, instance, **kwargs):
    Layer.objects.filter(pk=instance.pk).update(
        search_vector=SearchVector(
            'name', 'title', 'abstract', 'keywords', 'attribution', 'styles'
        )
    )