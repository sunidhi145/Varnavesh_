import {
  contactFormSchema,
  consultationFormSchema,
  customDesignFormSchema,
  type ConsultationFormValues,
  type ContactFormValues,
  type CustomDesignFormValues,
  validateReferenceFiles,
} from "@/lib/validators";
import { seedProducts } from "@/lib/seed-products";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

const seedProductImageBySlug: Record<string, string> = {
  "tiger-and-triumph": "/products/product-1.jpg",
  "lotus-and-leather": "/products/product-2.jpg",
  "peacock-and-power": "/products/product-3.jpg",
  "regal-fusion": "/products/product-4.jpg",
  "crimson-confluence": "/products/product-5.jpg",
  "ivory-valor": "/products/product-6.jpg",
  "the-royal-vision": "/products/product-7.jpg",
  "the-maharaja-knot": "/products/product-8.jpg",
  "the-lotus-bind": "/products/product-9.jpg",
};

type ApiErrorPayload = {
  error?: string;
  message?: string;
};

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

function getSeedProducts() {
  return seedProducts.map((product) => ({
    ...product,
    image_url: resolveAssetUrl(product.image_url || seedProductImageBySlug[product.slug] || ""),
  }));
}

export type CartLineItemPayload = {
  productId: string;
  quantity: number;
};

export type CheckoutFormPayload = {
  fullName: string;
  email: string;
  phoneNumber: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  notes?: string;
};

export type OrderRecord = {
  id: string;
  payment_provider: "stripe";
  payment_status: "pending" | "paid" | "unpaid";
  order_status: "pending_payment" | "confirmed";
  stripe_checkout_session_id: string;
  stripe_payment_intent_id: string | null;
  currency: string;
  total_amount_inr: number;
  created_at: string;
  updated_at: string;
  notes: string;
  customer: {
    id: string;
    full_name: string;
    email: string;
    phone_number: string;
    address: string;
    city: string;
    state: string;
    postal_code: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    unit_price_inr: number;
    subtotal_inr: number;
    product_id: string;
    product_slug: string;
    product_name: string;
    product_image_url: string;
  }>;
};

type ProductsResponse = {
  products: ProductRecord[];
};

type SubmissionResponse = {
  id: string;
  imageUploadWarning?: string | null;
};

type CheckoutSessionResponse = {
  checkoutUrl: string;
  orderId: string;
  sessionId: string;
};

type ConfirmPaymentResponse = {
  order: OrderRecord;
};

function apiUrl(path: string) {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

function resolveAssetUrl(url: string) {
  if (!url) {
    return url;
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  const normalizedUrl = url.startsWith("/") ? url : `/${url}`;

  // Product seed images are bundled with the frontend app, while uploads are served by the API.
  if (normalizedUrl.startsWith("/uploads")) {
    return API_BASE_URL ? `${API_BASE_URL}${normalizedUrl}` : normalizedUrl;
  }

  return normalizedUrl;
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9.-]/g, "-").toLowerCase();
}

function buildUploadFileName(file: File) {
  const extension = file.name.includes(".") ? file.name.split(".").pop() ?? "jpg" : "jpg";
  const baseName = file.name.endsWith(`.${extension}`) ? file.name.slice(0, -(extension.length + 1)) : file.name;
  const safeBaseName = sanitizeFileName(`${Date.now()}-${baseName}`).replace(/[.-]+$/, "");

  return `${crypto.randomUUID()}-${safeBaseName}.${extension.toLowerCase()}`;
}

async function parseResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const payloadText = await response.text();
  let payload: T | ApiErrorPayload | null = null;

  if (payloadText) {
    try {
      payload = JSON.parse(payloadText) as T | ApiErrorPayload;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const errorMessage =
      (payload as ApiErrorPayload | null)?.error ??
      (payload as ApiErrorPayload | null)?.message ??
      fallbackMessage;
    throw new Error(errorMessage);
  }

  return (payload ?? {}) as T;
}

export async function fetchProducts() {
  try {
    const response = await fetch(apiUrl("/api/products"));
    const payload = await parseResponse<ProductsResponse>(response, "We couldn't load the collection right now.");

    if (!Array.isArray(payload.products) || payload.products.length === 0) {
      return getSeedProducts();
    }

    return payload.products.map((product) => ({
      ...product,
      image_url: resolveAssetUrl(product.image_url || seedProductImageBySlug[product.slug] || ""),
    }));
  } catch {
    return getSeedProducts();
  }
}

export async function createCheckoutSession(customer: CheckoutFormPayload, items: CartLineItemPayload[]) {
  const response = await fetch(apiUrl("/api/checkout/session"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customer: {
        fullName: customer.fullName,
        email: customer.email,
        phoneNumber: customer.phoneNumber,
        address: customer.address,
        city: customer.city,
        state: customer.state,
        postalCode: customer.postalCode,
      },
      items,
      notes: customer.notes ?? "",
    }),
  });

  return parseResponse<CheckoutSessionResponse>(response, "We couldn't start checkout right now.");
}

export async function confirmOrderPayment(sessionId: string) {
  const response = await fetch(apiUrl("/api/orders/confirm-payment"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sessionId }),
  });

  const payload = await parseResponse<ConfirmPaymentResponse>(
    response,
    "We couldn't confirm your payment right now.",
  );

  return payload.order;
}

export function getProductFallbackImage(slug: string) {
  return resolveAssetUrl(seedProductImageBySlug[slug] || "/products/product-1.jpg");
}

export async function submitContact(values: ContactFormValues, honeypot: string) {
  const parsed = contactFormSchema.parse(values);
  const response = await fetch(apiUrl("/api/contacts"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contact: parsed.contact,
      email: parsed.email,
      honeypot,
      name: parsed.name,
      query: parsed.query,
    }),
  });
  const payload = await parseResponse<SubmissionResponse>(response, "We couldn't send your message right now.");
  return payload.id;
}

export async function submitConsultation(values: ConsultationFormValues, honeypot: string) {
  const parsed = consultationFormSchema.parse(values);
  const response = await fetch(apiUrl("/api/consultations"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      date: parsed.date,
      email: parsed.email,
      honeypot,
      name: parsed.name,
      notes: parsed.notes || "",
      time: parsed.time,
    }),
  });
  const payload = await parseResponse<SubmissionResponse>(
    response,
    "We couldn't save your consultation booking right now.",
  );
  return payload.id;
}

export async function submitCustomDesignRequest(
  values: CustomDesignFormValues,
  honeypot: string,
  files: File[],
) {
  const parsed = customDesignFormSchema.parse(values);
  validateReferenceFiles(files);

  const formData = new FormData();
  formData.append("garmentType", parsed.garmentType);
  formData.append("fabric", parsed.fabric);
  formData.append("occasion", parsed.occasion);
  formData.append("size", parsed.size);
  formData.append("details", parsed.details);
  formData.append("honeypot", honeypot);

  for (const file of files) {
    formData.append("images", file, buildUploadFileName(file));
  }

  try {
    const response = await fetch(apiUrl("/api/custom-design-requests"), {
      method: "POST",
      body: formData,
    });

    return await parseResponse<SubmissionResponse>(
      response,
      "We couldn't save your custom design request right now.",
    );
  } catch (error) {
    throw new Error(getErrorMessage(error, "We couldn't save your custom design request right now."));
  }
}
