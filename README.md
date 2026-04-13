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

Create a `.env` file in the project root using this structure:

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

- The frontend can still be deployed to Vercel.
- The backend is better deployed to a long-running Node host such as Railway, Render, Fly.io, or a VPS.
- Vercel serverless functions are not the best fit for Neo4j because Bolt connections and cold starts are a rougher match than a persistent Express server.
- If you deploy frontend and backend separately, set:
  - `FRONTEND_ORIGIN` on the backend
  - `PUBLIC_BASE_URL` on the backend
  - `VITE_API_BASE_URL` on the frontend

## Storage Tradeoffs After Moving to Neo4j

- Product, inquiry, booking, and request data now lives in a graph database instead of PostgreSQL tables.
- Accessories remain in the same `Product` label because they share the exact same shape as outfits.
- Optional reference images are stored on disk locally for simplicity; for cloud deployment, swap that layer to object storage like S3, Cloudinary, or similar.
