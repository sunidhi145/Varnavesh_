import { randomUUID } from "node:crypto";
import { ApiError } from "./errors.js";
import { serverConfig } from "./config.js";
import { getNeo4jDriver } from "./neo4j.js";
import { fetchProducts, type ProductRecord } from "./repository.js";
import { getStripeClient } from "./stripe.js";
import type { CheckoutItemPayload, CreateCheckoutSessionPayload } from "./validation.js";

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

type OrderNode = {
  id: string;
  paymentProvider: "stripe";
  paymentStatus: "pending" | "paid" | "unpaid";
  orderStatus: "pending_payment" | "confirmed";
  stripeCheckoutSessionId: string;
  stripePaymentIntentId?: string | null;
  currency: string;
  totalAmountInr: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

type CustomerNode = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
};

type OrderItemNode = {
  id: string;
  quantity: number;
  unitPriceInr: number;
  subtotalInr: number;
  productId: string;
  productSlug: string;
  productName: string;
  productImageUrl: string;
};

type PreparedOrderItem = {
  product: ProductRecord;
  productId: string;
  quantity: number;
  unitPriceInr: number;
  subtotalInr: number;
};

const commerceConstraintStatements = [
  "CREATE CONSTRAINT customer_email_unique IF NOT EXISTS FOR (c:Customer) REQUIRE c.email IS UNIQUE",
  "CREATE CONSTRAINT order_id_unique IF NOT EXISTS FOR (o:Order) REQUIRE o.id IS UNIQUE",
  "CREATE CONSTRAINT order_session_unique IF NOT EXISTS FOR (o:Order) REQUIRE o.stripeCheckoutSessionId IS UNIQUE",
  "CREATE CONSTRAINT order_item_id_unique IF NOT EXISTS FOR (i:OrderItem) REQUIRE i.id IS UNIQUE",
];

function mapOrder(order: OrderNode, customer: CustomerNode, items: OrderItemNode[]): OrderRecord {
  return {
    id: order.id,
    payment_provider: order.paymentProvider,
    payment_status: order.paymentStatus,
    order_status: order.orderStatus,
    stripe_checkout_session_id: order.stripeCheckoutSessionId,
    stripe_payment_intent_id: order.stripePaymentIntentId || null,
    currency: order.currency.toUpperCase(),
    total_amount_inr: Number(order.totalAmountInr),
    created_at: order.createdAt,
    updated_at: order.updatedAt,
    notes: order.notes ?? "",
    customer: {
      id: customer.id,
      full_name: customer.fullName,
      email: customer.email,
      phone_number: customer.phoneNumber,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      postal_code: customer.postalCode,
    },
    items: items.map((item) => ({
      id: item.id,
      quantity: Number(item.quantity),
      unit_price_inr: Number(item.unitPriceInr),
      subtotal_inr: Number(item.subtotalInr),
      product_id: item.productId,
      product_slug: item.productSlug,
      product_name: item.productName,
      product_image_url: item.productImageUrl,
    })),
  };
}

function normalizeCheckoutItems(items: CheckoutItemPayload[]) {
  const quantitiesByProductId = new Map<string, number>();

  for (const item of items) {
    const currentQuantity = quantitiesByProductId.get(item.productId) ?? 0;
    quantitiesByProductId.set(item.productId, currentQuantity + item.quantity);
  }

  return Array.from(quantitiesByProductId.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

async function prepareOrderItems(items: CheckoutItemPayload[]) {
  const normalizedItems = normalizeCheckoutItems(items);
  const products = await fetchProducts();
  const productsById = new Map(products.map((product) => [product.id, product]));

  const preparedItems: PreparedOrderItem[] = normalizedItems.map(({ productId, quantity }) => {
    const product = productsById.get(productId);

    if (!product) {
      throw new ApiError("One or more cart items are no longer available.");
    }

    return {
      product,
      productId,
      quantity,
      unitPriceInr: product.price_inr,
      subtotalInr: product.price_inr * quantity,
    };
  });

  if (!preparedItems.length) {
    throw new ApiError("Your cart is empty.");
  }

  return preparedItems;
}

async function fetchOrderBySessionId(sessionId: string) {
  const driver = getNeo4jDriver();
  const session = driver.session({ database: serverConfig.neo4j.database });

  try {
    const result = await session.run(
      `
        MATCH (customer:Customer)-[:PLACED]->(order:Order {stripeCheckoutSessionId: $sessionId})
        OPTIONAL MATCH (order)-[:HAS_ITEM]->(item:OrderItem)
        RETURN
          order {
            .id,
            .paymentProvider,
            .paymentStatus,
            .orderStatus,
            .stripeCheckoutSessionId,
            .stripePaymentIntentId,
            .currency,
            .totalAmountInr,
            .notes,
            .createdAt,
            .updatedAt
          } AS order,
          customer {
            .id,
            .fullName,
            .email,
            .phoneNumber,
            .address,
            .city,
            .state,
            .postalCode
          } AS customer,
          collect(item {
            .id,
            .quantity,
            .unitPriceInr,
            .subtotalInr,
            .productId,
            .productSlug,
            .productName,
            .productImageUrl
          }) AS items
      `,
      { sessionId },
    );

    const record = result.records[0];

    if (!record) {
      throw new ApiError("Order not found for this checkout session.", 404);
    }

    const rawItems = (record.get("items") as Array<OrderItemNode | null>).filter(
      (item): item is OrderItemNode => Boolean(item?.id),
    );

    return mapOrder(record.get("order") as OrderNode, record.get("customer") as CustomerNode, rawItems);
  } finally {
    await session.close();
  }
}

export async function ensureCommerceSchema() {
  const driver = getNeo4jDriver();
  const session = driver.session({ database: serverConfig.neo4j.database });

  try {
    await session.executeWrite(async (tx) => {
      for (const statement of commerceConstraintStatements) {
        await tx.run(statement);
      }
    });
  } finally {
    await session.close();
  }
}

export async function createStripeCheckoutSession(input: CreateCheckoutSessionPayload) {
  const preparedItems = await prepareOrderItems(input.items);
  const totalAmountInr = preparedItems.reduce((sum, item) => sum + item.subtotalInr, 0);
  const orderId = randomUUID();
  const createdAt = new Date().toISOString();
  const customerEmail = input.customer.email.trim().toLowerCase();
  const stripe = getStripeClient();

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    currency: serverConfig.stripe.currency,
    customer_email: customerEmail,
    billing_address_collection: "required",
    phone_number_collection: {
      enabled: true,
    },
    payment_method_types: ["card"],
    line_items: preparedItems.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: serverConfig.stripe.currency,
        unit_amount: item.unitPriceInr * 100,
        product_data: {
          name: item.product.name,
          metadata: {
            productId: item.productId,
            slug: item.product.slug,
          },
        },
      },
    })),
    metadata: {
      customerEmail,
      orderId,
    },
    success_url: `${serverConfig.frontendOrigin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${serverConfig.frontendOrigin}/checkout?cancelled=1`,
  });

  if (!checkoutSession.url || !checkoutSession.id) {
    throw new ApiError("Stripe could not create a checkout session.");
  }

  const driver = getNeo4jDriver();
  const session = driver.session({ database: serverConfig.neo4j.database });
  const customerId = randomUUID();

  try {
    await session.executeWrite(async (tx) => {
      await tx.run(
        `
          MERGE (customer:Customer {email: $email})
          ON CREATE SET
            customer.id = $customerId,
            customer.createdAt = $createdAt
          SET
            customer.fullName = $fullName,
            customer.phoneNumber = $phoneNumber,
            customer.address = $address,
            customer.city = $city,
            customer.state = $state,
            customer.postalCode = $postalCode,
            customer.updatedAt = $createdAt

          CREATE (order:Order {
            id: $orderId,
            paymentProvider: 'stripe',
            paymentStatus: 'pending',
            orderStatus: 'pending_payment',
            stripeCheckoutSessionId: $stripeCheckoutSessionId,
            stripePaymentIntentId: '',
            currency: $currency,
            totalAmountInr: $totalAmountInr,
            notes: $notes,
            createdAt: $createdAt,
            updatedAt: $createdAt
          })

          MERGE (customer)-[:PLACED]->(order)
        `,
        {
          address: input.customer.address,
          city: input.customer.city,
          createdAt,
          currency: serverConfig.stripe.currency.toUpperCase(),
          customerId,
          email: customerEmail,
          fullName: input.customer.fullName,
          notes: input.notes,
          orderId,
          phoneNumber: input.customer.phoneNumber,
          postalCode: input.customer.postalCode,
          state: input.customer.state,
          stripeCheckoutSessionId: checkoutSession.id,
          totalAmountInr,
        },
      );

      for (const item of preparedItems) {
        await tx.run(
          `
            MATCH (order:Order {id: $orderId})
            MERGE (product:Product {id: $productId})
            ON CREATE SET
              product.slug = $productSlug,
              product.name = $productName,
              product.priceInr = $unitPriceInr,
              product.imageUrl = $productImageUrl,
              product.category = $productCategory,
              product.productType = $productType,
              product.description = $productDescription,
              product.isFeatured = false,
              product.isActive = true,
              product.createdAt = $createdAt,
              product.updatedAt = $createdAt
            CREATE (orderItem:OrderItem {
              id: $orderItemId,
              quantity: $quantity,
              unitPriceInr: $unitPriceInr,
              subtotalInr: $subtotalInr,
              productId: $productId,
              productSlug: $productSlug,
              productName: $productName,
              productImageUrl: $productImageUrl,
              createdAt: $createdAt
            })
            CREATE (order)-[:HAS_ITEM]->(orderItem)
            CREATE (orderItem)-[:REFERENCES]->(product)
          `,
          {
            createdAt,
            orderId,
            orderItemId: randomUUID(),
            productId: item.productId,
            productCategory: item.product.category,
            productDescription: item.product.description ?? "",
            productImageUrl: item.product.image_url,
            productName: item.product.name,
            productSlug: item.product.slug,
            productType: item.product.product_type,
            quantity: item.quantity,
            subtotalInr: item.subtotalInr,
            unitPriceInr: item.unitPriceInr,
          },
        );
      }
    });
  } finally {
    await session.close();
  }

  return {
    checkoutUrl: checkoutSession.url,
    orderId,
    sessionId: checkoutSession.id,
  };
}

export async function confirmStripePayment(sessionId: string) {
  const stripe = getStripeClient();
  const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);

  if (!stripeSession.id) {
    throw new ApiError("Stripe session could not be verified.");
  }

  const driver = getNeo4jDriver();
  const session = driver.session({ database: serverConfig.neo4j.database });
  const updatedAt = new Date().toISOString();
  const paymentStatus = stripeSession.payment_status === "paid" ? "paid" : "unpaid";
  const orderStatus = stripeSession.payment_status === "paid" ? "confirmed" : "pending_payment";

  try {
    await session.executeWrite(async (tx) => {
      await tx.run(
        `
          MATCH (order:Order {stripeCheckoutSessionId: $sessionId})
          SET
            order.paymentStatus = $paymentStatus,
            order.orderStatus = $orderStatus,
            order.stripePaymentIntentId = $stripePaymentIntentId,
            order.updatedAt = $updatedAt
        `,
        {
          orderStatus,
          paymentStatus,
          sessionId,
          stripePaymentIntentId:
            typeof stripeSession.payment_intent === "string" ? stripeSession.payment_intent : "",
          updatedAt,
        },
      );
    });
  } finally {
    await session.close();
  }

  return fetchOrderBySessionId(sessionId);
}
