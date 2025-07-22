from django.contrib.postgres.search import SearchVector
from django.db import migrations


def compute_search_vector(apps, schema_editor):
    Layer = apps.get_model("main", "Layer")
    Layer.objects.update(search_vector=SearchVector(
        'type',
        'name',
        'title',
        'abstract',
        'keywords',
        'attribution',
        'styles',    
    ))

class Migration(migrations.Migration):

    dependencies = [
        ("main", "0028_layer_search_vector_and_more"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            CREATE TRIGGER search_vector_trigger
            BEFORE INSERT OR UPDATE OF type, name, title, abstract, keywords, attribution, styles
            ON main_layer
            FOR EACH ROW EXECUTE PROCEDURE
            tsvector_update_trigger(
                search_vector, 'pg_catalog.english', type, name, title, abstract, keywords, attribution, styles
            );
            UPDATE main_layer SET search_vector = NULL;
            """,
            reverse_sql="""
            DROP TRIGGER IF EXISTS search_vector_trigger
            ON main_layer;
            """,
        ),
        migrations.RunPython(
            compute_search_vector, reverse_code=migrations.RunPython.noop
        ),
    ]