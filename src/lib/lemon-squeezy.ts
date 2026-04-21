import { createHmac } from "crypto";

/** Creates a Lemon Squeezy checkout and returns the checkout URL. */
export async function createLSCheckout(
  apiKey: string,
  storeId: string,
  productId: string,
  priceInCents: number,
  customData: Record<string, string>
): Promise<string> {
  const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/vnd.api+json",
      Accept: "application/vnd.api+json",
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          custom_price: priceInCents,
          checkout_data: { custom: customData },
        },
        relationships: {
          store: { data: { type: "stores", id: storeId } },
          variant: { data: { type: "variants", id: productId } },
        },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.errors?.[0]?.detail ?? "Error al procesar el pago");
  }

  const data = await res.json();
  return data?.data?.attributes?.url as string;
}

/** Returns true if the HMAC-SHA256 signature matches. */
export function verifyLSSignature(body: string, signature: string): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? "";
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  return signature === expected;
}
