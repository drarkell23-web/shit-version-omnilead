# Admin Dashboard

Open index.html locally. This page callsAdmin Dashboard (Static package)
--------------------------------

How to use:
1. Replace API_BASE in app.js with your Render API base (example: https://service-point-sa-1.onrender.com).
2. To create contractors you may need to supply the admin key in the "Admin key" field (depends on your server setup).
3. Zip this folder and keep private. This static admin page talks to your Render API endpoints:
   - POST /api/admin/create-contractor
   - GET /api/contractors
   - GET /api/leads
   - GET /api/reviews
 `/api/admin/create-contractor` on your server. Keep your service key safe.