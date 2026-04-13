import { randomUUID } from "node:crypto";
import type { Express } from "express";
import { ApiError } from "./errors.js";
import { serverConfig } from "./config.js";
import { getNeo4jDriver } from "./neo4j.js";
import { seedProducts, type SeedProduct } from "./seed-data.js";
import type { ContactPayload, ConsultationPayload, CustomDesignPayload } from "./validation.js";

export type ProductRecord = {
  id: string;
  slug: string;
  name: string;
  price_inr: number;
  image_url: string;
  category: string;
  product_type: "outfit" | "accessory";
  description: string | null;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ProductNode = {
  id: string;
  sortOrder?: number;
  slug: string;
  name: string;
  priceInr: number;
  imageUrl: string;
  category: string;
  productType: "outfit" | "accessory";
  description?: string | null;
  isFeatured: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

function mapProduct(product: ProductNode): ProductRecord {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    price_inr: Number(product.priceInr),
    image_url: product.imageUrl,
    category: product.category,
    product_type: product.productType,
    description: product.description ?? null,
    is_featured: Boolean(product.isFeatured),
    is_active: Boolean(product.isActive),
    created_at: product.createdAt,
    updated_at: product.updatedAt,
  };
}

function mapSeedProduct(product: SeedProduct): ProductRecord {
  const now = new Date().toISOString();

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    price_inr: Number(product.priceInr),
    image_url: product.imageUrl,
    category: product.category,
    product_type: product.productType,
    description: product.description ?? null,
    is_featured: Boolean(product.isFeatured),
    is_active: Boolean(product.isActive),
    created_at: now,
    updated_at: now,
  };
}

function getSeedProductBySlug(slug: string) {
  return seedProducts.find((product) => product.slug === slug);
}

function withSeedDefaults(product: ProductRecord): ProductRecord {
  const seededProduct = getSeedProductBySlug(product.slug);

  if (!seededProduct) {
    return product;
  }

  return {
    ...product,
    category: product.category || seededProduct.category,
    description: product.description ?? seededProduct.description,
    image_url: seededProduct.imageUrl,
    product_type: product.product_type ?? seededProduct.productType,
  };
}

function mergeWithSeedProducts(products: ProductRecord[], productType?: "outfit" | "accessory") {
  const normalizedProducts = products.map(withSeedDefaults);
  const seededProducts = seedProducts
    .filter((product) => !productType || product.productType === productType)
    .map(mapSeedProduct);

  const existingSlugs = new Set(normalizedProducts.map((product) => product.slug));
  const missingSeededProducts = seededProducts.filter((product) => !existingSlugs.has(product.slug));

  return [...normalizedProducts, ...missingSeededProducts].sort((left, right) => {
    const leftSeed = getSeedProductBySlug(left.slug);
    const rightSeed = getSeedProductBySlug(right.slug);
    const leftOrder = leftSeed?.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = rightSeed?.sortOrder ?? Number.MAX_SAFE_INTEGER;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.created_at.localeCompare(right.created_at);
  });
}


export async function createContactSubmission(input: ContactPayload) {
  if (input.honeypot) {
    throw new ApiError("Spam submission rejected.");
  }

  const driver = getNeo4jDriver();
  const session = driver.session({ database: serverConfig.neo4j.database });
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  try {
    await session.executeWrite(async (tx) => {
      const duplicateResult = await tx.run(
        `
          MATCH (c:ContactSubmission)
          WHERE toLower(c.email) = toLower($email)
            AND toLower(c.message) = toLower($message)
            AND datetime(c.createdAt) > datetime($cutoff)
          RETURN c.id AS id
          LIMIT 1
        `,
        {
          cutoff,
          email: input.email,
          message: input.query,
        },
      );

      if (duplicateResult.records.length) {
        throw new ApiError("This message was already submitted recently. Please wait before sending it again.");
      }

      await tx.run(
        `
          CREATE (c:ContactSubmission {
            id: $id,
            name: $name,
            contactNumber: $contactNumber,
            email: toLower($email),
            message: $message,
            status: 'new',
            createdAt: $createdAt,
            source: 'website'
          })
        `,
        {
          contactNumber: input.contact,
          createdAt,
          email: input.email,
          id,
          message: input.query,
          name: input.name,
        },
      );
    });

    return { id };
  } finally {
    await session.close();
  }
}

export async function createConsultationBooking(input: ConsultationPayload) {
  if (input.honeypot) {
    throw new ApiError("Spam submission rejected.");
  }

  const driver = getNeo4jDriver();
  const session = driver.session({ database: serverConfig.neo4j.database });
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  try {
    await session.executeWrite(async (tx) => {
      const duplicateResult = await tx.run(
        `
          MATCH (c:ConsultationBooking)
          WHERE toLower(c.email) = toLower($email)
            AND c.preferredDate = $preferredDate
            AND c.preferredTime = $preferredTime
            AND datetime(c.createdAt) > datetime($cutoff)
          RETURN c.id AS id
          LIMIT 1
        `,
        {
          cutoff,
          email: input.email,
          preferredDate: input.date,
          preferredTime: input.time,
        },
      );

      if (duplicateResult.records.length) {
        throw new ApiError("This consultation slot was already requested recently. Please wait before trying again.");
      }

      await tx.run(
        `
          CREATE (c:ConsultationBooking {
            id: $id,
            name: $name,
            email: toLower($email),
            preferredDate: $preferredDate,
            preferredTime: $preferredTime,
            notes: $notes,
            status: 'new',
            createdAt: $createdAt,
            source: 'website'
          })
        `,
        {
          createdAt,
          email: input.email,
          id,
          name: input.name,
          notes: input.notes,
          preferredDate: input.date,
          preferredTime: input.time,
        },
      );
    });

    return { id };
  } finally {
    await session.close();
  }
}

export async function fetchProducts(productType?: "outfit" | "accessory") {
  const driver = getNeo4jDriver();
  const session = driver.session({ database: serverConfig.neo4j.database });

  try {
    const result = await session.run(
      `
        MATCH (p:Product)
        OPTIONAL MATCH (p)-[:BELONGS_TO]->(c:Category)
        WHERE p.isActive = true
          AND ($productType IS NULL OR p.productType = $productType)
        RETURN p {
          .id,
          .slug,
          .name,
          .priceInr,
          .imageUrl,
          category: coalesce(p.category, c.name),
          .productType,
          .description,
          .isFeatured,
          .isActive,
          .createdAt,
          .updatedAt
        } AS product
        ORDER BY coalesce(p.sortOrder, 9999) ASC, p.createdAt ASC
      `,
      {
        productType: productType ?? null,
      },
    );

    const products = result.records.map((record) =>
      mapProduct(record.get("product") as ProductNode),
    );

    return mergeWithSeedProducts(products, productType);
  } catch (error) {
    console.error("Falling back to seeded products because Neo4j product fetch failed.", error);
    return mergeWithSeedProducts([], productType);
  } finally {
    await session.close();
  }
}

export async function createCustomDesignRequest(
  requestId: string,
  input: CustomDesignPayload,
  files: Express.Multer.File[],
) {
  if (input.honeypot) {
    throw new ApiError("Spam submission rejected.");
  }

  const driver = getNeo4jDriver();
  const session = driver.session({ database: serverConfig.neo4j.database });
  const createdAt = new Date().toISOString();

  try {
    await session.executeWrite(async (tx) => {
      await tx.run(
        `
          CREATE (request:CustomDesignRequest {
            id: $id,
            garmentType: $garmentType,
            fabric: $fabric,
            occasion: $occasion,
            size: $size,
            details: $details,
            status: 'new',
            createdAt: $createdAt,
            source: 'website'
          })
        `,
        {
          createdAt,
          details: input.details,
          fabric: input.fabric,
          garmentType: input.garmentType,
          id: requestId,
          occasion: input.occasion,
          size: input.size,
        },
      );

      for (const file of files) {
        const normalizedRelativePath = `custom-design-requests/${requestId}/${file.filename}`.replace(/\\/g, "/");
        const publicUrl = `${serverConfig.publicBaseUrl}/uploads/${normalizedRelativePath}`;

        await tx.run(
          `
            MATCH (request:CustomDesignRequest {id: $requestId})
            CREATE (image:ReferenceImage {
              id: $id,
              fileName: $fileName,
              storagePath: $storagePath,
              publicUrl: $publicUrl,
              mimeType: $mimeType,
              sizeBytes: $sizeBytes,
              createdAt: $createdAt
            })
            CREATE (image)-[:ATTACHED_TO]->(request)
          `,
          {
            createdAt,
            fileName: file.originalname,
            id: randomUUID(),
            mimeType: file.mimetype,
            publicUrl,
            requestId,
            sizeBytes: file.size,
            storagePath: normalizedRelativePath,
          },
        );
      }
    });

    return { id: requestId, imageUploadWarning: null };
  } finally {
    await session.close();
  }
}

export async function seedDatabase(products: SeedProduct[]) {
  const driver = getNeo4jDriver();
  const session = driver.session({ database: serverConfig.neo4j.database });
  const seededAt = new Date().toISOString();

  try {
    await session.executeWrite(async (tx) => {
      const constraints = [
        "CREATE CONSTRAINT product_slug_unique IF NOT EXISTS FOR (p:Product) REQUIRE p.slug IS UNIQUE",
        "CREATE CONSTRAINT category_slug_unique IF NOT EXISTS FOR (c:Category) REQUIRE c.slug IS UNIQUE",
        "CREATE CONSTRAINT contact_id_unique IF NOT EXISTS FOR (c:ContactSubmission) REQUIRE c.id IS UNIQUE",
        "CREATE CONSTRAINT consultation_id_unique IF NOT EXISTS FOR (c:ConsultationBooking) REQUIRE c.id IS UNIQUE",
        "CREATE CONSTRAINT custom_design_request_id_unique IF NOT EXISTS FOR (c:CustomDesignRequest) REQUIRE c.id IS UNIQUE",
        "CREATE CONSTRAINT reference_image_id_unique IF NOT EXISTS FOR (r:ReferenceImage) REQUIRE r.id IS UNIQUE",
      ];

      for (const statement of constraints) {
        await tx.run(statement);
      }

      await tx.run(
        `
          UNWIND $products AS product
          MERGE (category:Category {slug: product.categorySlug})
          ON CREATE SET
            category.name = product.category,
            category.createdAt = $seededAt
          SET
            category.updatedAt = $seededAt
          MERGE (p:Product {slug: product.slug})
          ON CREATE SET
            p.id = product.id,
            p.createdAt = $seededAt
          SET
            p.name = product.name,
            p.sortOrder = product.sortOrder,
            p.priceInr = product.priceInr,
            p.imageUrl = product.imageUrl,
            p.category = product.category,
            p.productType = product.productType,
            p.description = product.description,
            p.isFeatured = product.isFeatured,
            p.isActive = product.isActive,
            p.updatedAt = $seededAt
          MERGE (p)-[:BELONGS_TO]->(category)
        `,
        {
          products: products.map((product) => ({
            ...product,
            categorySlug: product.category.toLowerCase().replace(/\s+/g, "-"),
          })),
          seededAt,
        },
      );
    });
  } finally {
    await session.close();
  }
}
