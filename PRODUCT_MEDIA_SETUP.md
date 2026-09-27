# Product photo storage on Render

The Django API stores original uploads unchanged. It does not compress or resize them. CSS now displays full images with `object-fit: contain`, so tall jewelry photos are not cropped.

Before deploying this change to the existing `sahara-gold-backend` service:

1. Attach a **persistent disk** to that service in Render, mounted at `/var/data` (start with 1 GB). A disk has an ongoing charge and briefly interrupts the service during deployments.
2. Set `MEDIA_ROOT=/var/data` on the backend service. The Blueprint in `render.yaml` declares both settings for Blueprint managed services; confirm the live service has them because a Git commit alone may not apply Blueprint changes to an existing service.
3. Deploy the backend, confirm migration `products.0006_productimage` ran, then upload a new product photo and check its `/media/products/...` URL after a subsequent deploy.

Without the disk, uploads in the old `backend/media` directory were on an ephemeral filesystem and may already be gone. A new disk cannot restore missing files. Replace those photos from the original files. Existing images that are still available should be backed up before attaching the disk because the previous instance stops during the disk deploy.

One product can have a cover image and up to eight additional gallery images. Removing a gallery image detaches it from the product. The API keeps the original uploaded resolution, subject to a 10 MB per image limit.
