# Migration manuelle pour synchroniser la DB avec les modèles Django actuels.
# La DB était dans l'état de l'ancienne version "geogalup" avec des tables/colonnes
# renommées depuis. Les migrations étaient marquées [X] mais jamais vraiment appliquées.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('photos', '0006_photo_image_url_alter_photo_image'),
    ]

    operations = [
        # 1. Supprimer la FK photos_photo.document_type_id -> photos_documenttype
        migrations.RunSQL(
            sql="""
                ALTER TABLE photos_photo
                DROP CONSTRAINT IF EXISTS photos_photo_document_type_id_55bc9177_fk_photos_do;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # 2. Supprimer la FK photos_photo.site_source_id -> photos_sitesource
        migrations.RunSQL(
            sql="""
                ALTER TABLE photos_photo
                DROP CONSTRAINT IF EXISTS photos_photo_site_source_id_72500edf_fk_photos_sitesource_id;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # 3. Renommer la colonne site_source_id -> source_id dans photos_photo
        migrations.RunSQL(
            sql="""
                DO $$
                BEGIN
                    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='photos_photo' and column_name='site_source_id') THEN
                        ALTER TABLE photos_photo RENAME COLUMN site_source_id TO source_id;
                    END IF;
                END $$;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # 4. Renommer la table photos_sitesource -> photos_source
        migrations.RunSQL(
            sql="""
                DO $$
                BEGIN
                    IF EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='photos_sitesource') THEN
                        ALTER TABLE photos_sitesource RENAME TO photos_source;
                    END IF;
                END $$;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # 5. Renommer la PK de photos_source (optionnel mais propre)
        migrations.RunSQL(
            sql="""
                ALTER INDEX IF EXISTS photos_sitesource_pkey
                RENAME TO photos_source_pkey;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # 6. Recréer la FK photos_photo.source_id -> photos_source
        migrations.RunSQL(
            sql="""
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='photos_photo_source_id_fk_photos_source_id') THEN
                        ALTER TABLE photos_photo
                        ADD CONSTRAINT photos_photo_source_id_fk_photos_source_id
                        FOREIGN KEY (source_id) REFERENCES photos_source(id)
                        DEFERRABLE INITIALLY DEFERRED;
                    END IF;
                END $$;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # 7. Supprimer les index liés à site_source_id et document_type_id
        migrations.RunSQL(
            sql="""
                DROP INDEX IF EXISTS photos_photo_site_source_id_72500edf;
                DROP INDEX IF EXISTS photos_photo_document_type_id_55bc9177;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # 8. Supprimer les colonnes obsolètes de photos_photo
        migrations.RunSQL(
            sql="""
                ALTER TABLE photos_photo
                DROP COLUMN IF EXISTS origin_url,
                DROP COLUMN IF EXISTS document_type_id,
                DROP COLUMN IF EXISTS publication_year;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # 9. Supprimer la table photos_documenttype (devenue orpheline)
        migrations.RunSQL(
            sql="DROP TABLE IF EXISTS photos_documenttype;",
            reverse_sql=migrations.RunSQL.noop,
        ),

        # 10. Recréer l'index sur source_id (Django en a besoin)
        migrations.RunSQL(
            sql="""
                CREATE INDEX IF NOT EXISTS photos_photo_source_id_idx
                ON photos_photo(source_id);
            """,
            reverse_sql="DROP INDEX IF EXISTS photos_photo_source_id_idx;",
        ),
    ]
