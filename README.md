# VARNAVESH Neo4j Stack

VARNAVESH now uses:

- `React + Vite + TypeScript` for the frontend
- `Node.js + Express` for the backend API
- `Neo4j` as the primary database
- local disk storage for optional custom-design reference uploads

## Architecture

- The frontend calls `/api/*` endpoints instead of talking directly to the database.
- The Express backend validates requests, talks to Neo4j through the official `neo4j-driver`, and serves uploaded reference images from `/uploads/*`.
- Products and accessories are both modeled as `:Product` nodes because they share the same fields and UI behavior; `productType` distinguishes `outfit` vs `accessory`.
- Categories are separate `:Category` nodes connected by `(:Product)-[:BELONGS_TO]->(:Category)`.
- Contacts, consultations, and custom design requests are stored as dedicated node types.
- Optional uploaded images are stored as `:ReferenceImage` nodes linked with `(:ReferenceImage)-[:ATTACHED_TO]->(:CustomDesignRequest)`.

## Neo4j Graph Model

### Nodes

- `(:Product { id, slug, sortOrder, name, priceInr, imageUrl, category, productType, description, isFeatured, isActive, createdAt, updatedAt })`
- `(:Category { slug, name, createdAt, updatedAt })`
- `(:ContactSubmission { id, name, contactNumber, email, message, status, createdAt, source })`
- `(:ConsultationBooking { id, name, email, preferredDate, preferredTime, notes, status, createdAt, source })`
- `(:CustomDesignRequest { id, garmentType, fabric, occasion, size, details, status, createdAt, source })`
- `(:ReferenceImage { id, fileName, storagePath, publicUrl, mimeType, sizeBytes, createdAt })`

### Relationships

- `(:Product)-[:BELONGS_TO]->(:Category)`
- `(:ReferenceImage)-[:ATTACHED_TO]->(:CustomDesignRequest)`

## Environment Variables

Create a `.env` file in the project root using [`.env.example`](./.env.example) as the starting point:

```env
PORT=4000
FRONTEND_ORIGIN=http://localhost:8080
PUBLIC_BASE_URL=http://localhost:4000
NEO4J_URI=neo4j://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=replace-with-your-password
NEO4J_DATABASE=neo4j
UPLOADS_DIR=storage/uploads
VITE_API_BASE_URL=
```

`VITE_API_BASE_URL` can stay blank for local development because Vite proxies `/api` and `/uploads` to the backend automatically.

For separate frontend/backend deployment, set `VITE_API_BASE_URL` to your backend origin, for example `https://api.yourdomain.com`.

`FRONTEND_ORIGIN` can be a comma-separated list when you need both your Vercel production URL and preview URL patterns allowed by CORS.

## Windows Local Setup

### 1. Install dependencies

```powershell
npm install
```

### 2. Start Neo4j locally

Use either Neo4j Desktop or Docker Desktop.

Docker example:

```powershell
docker run `
  --name varnavesh-neo4j `
  -p 7474:7474 -p 7687:7687 `
  -e NEO4J_AUTH=neo4j/your_password_here `
  -d neo4j:5
```

### 3. Seed the database

```powershell
npm run seed:neo4j
```

### 4. Start frontend + backend together

```powershell
npm run dev
```

Frontend:

- `http://localhost:8080`

Backend:

- `http://localhost:4000`

### 5. Production build

```powershell
npm run build
```

Start the compiled backend:

```powershell
npm run start
```

## API Endpoints

- `GET /api/health`
- `GET /api/products`
- `GET /api/products?type=outfit`
- `GET /api/products?type=accessory`
- `GET /api/accessories`
- `POST /api/contacts`
- `POST /api/consultations`
- `POST /api/custom-design-requests`

## Neo4j Seed Notes

The seed script:

- creates uniqueness constraints if they do not already exist
- creates or updates categories
- creates or updates the initial product and accessory catalog
- preserves the product image paths used by the current UI

## Deployment Notes

- Vercel should be used for the frontend build only.
- This repo now includes [`vercel.json`](./vercel.json) with:
  - install command: `npm install`
  - build command: `npm run build:vercel`
  - output directory: `dist`
  - SPA rewrite from `/*` to `/index.html`
- The Node engine is pinned to `20.x` in [`package.json`](./package.json) and `.nvmrc`, which is a currently supported Vercel version.
- The backend in [`server/index.ts`](./server/index.ts) is still a long-running Express + Neo4j service and should be hosted separately on Railway, Render, Fly.io, a VPS, or another persistent Node platform.
- Vercel serverless functions are not the best fit for this backend because Neo4j Bolt connections, file uploads, and Stripe checkout flows are better handled by a persistent server.
- The frontend remains deploy-safe on Vercel even without the backend:
  - product browsing falls back to the bundled seed catalog
  - checkout, contact, consultation, and custom design flows show a clear backend-setup message instead of failing with broken API calls
- If you deploy frontend and backend separately, set:
  - `FRONTEND_ORIGIN` on the backend to your Vercel site URL
  - `PUBLIC_BASE_URL` on the backend to the backend origin
  - `VITE_API_BASE_URL` on the frontend to the backend origin
- Netlify can still host the frontend, and [`netlify.toml`](./netlify.toml) remains configured for that static-only use case.

## Railway Backend Deploy

- This repo includes [`railway.json`](./railway.json) so Railway builds only the backend TypeScript and starts the compiled Express server.
- Railway build command: `npm install && npm run build:railway`
- Railway start command: `npm run start:railway`
- Add these Railway environment variables:
  - `PORT=4000`
  - `FRONTEND_ORIGIN=https://your-vercel-app.vercel.app`
  - `PUBLIC_BASE_URL=https://your-railway-backend.up.railway.app`
  - `NEO4J_URI=...`
  - `NEO4J_USERNAME=...`
  - `NEO4J_PASSWORD=...`
  - `NEO4J_DATABASE=neo4j`
  - `STRIPE_SECRET_KEY=...`
  - `STRIPE_CURRENCY=inr`
- If you use a custom Vercel domain too, set `FRONTEND_ORIGIN` as a comma-separated list, for example:
  - `https://varnavesh.vercel.app,https://www.varnavesh.com`
- After Railway is live, set `VITE_API_BASE_URL` in Vercel to the Railway backend URL and redeploy the frontend.
- Uploaded reference images currently use local disk storage, so Railway redeploys can remove old uploaded files. Move uploads to object storage later if you need durable file retention.

## Storage Tradeoffs After Moving to Neo4j

- Product, inquiry, booking, and request data now lives in a graph database instead of PostgreSQL tables.
- Accessories remain in the same `Product` label because they share the exact same shape as outfits.
- Optional reference images are stored on disk locally for simplicity; for cloud deployment, swap that layer to object storage like S3, Cloudinary, or similar.
