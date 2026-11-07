import { API_BASE_URL } from "../../shared/config/api";
import type {
  CartItem,
  GabyAccountEntry,
  GabyClient,
  GabyPaymentMethod,
  GabyPriceCategory,
  GabyPriceEntry,
  GabyProduct,
  GabySale,
  GabySalesSummary
} from "./gaby.types";

// El backend no manda la imagen en el JSON del producto (se guarda aparte,
// en binario, para no arrastrar base64 gigante en cada busqueda). Solo
// manda si tiene o no, y se arma la url completa aca.
type RawGabyProduct = Omit<GabyProduct, "imageUrl"> & { hasImage: boolean };

type RawProductResponse = {
  item: RawGabyProduct;
};

type ProductResponse = {
  item: GabyProduct;
};

function buildProductImageUrl(productId: number) {
  return `${API_BASE_URL}/gaby/products/${productId}/image`;
}

function mapProduct(raw: RawGabyProduct): GabyProduct {
  const { hasImage, ...rest } = raw;
  return { ...rest, imageUrl: hasImage ? buildProductImageUrl(raw.id) : null };
}

type SaleResponse = {
  item: GabySale;
};

export function normalizeBarcode(barcode: string) {
  return barcode.trim().replace(/\s+/g, "");
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Producto no encontrado.");
    }

    const fallbackText = await response.text().catch(() => "");
    let parsedMessage: string | undefined;
    try {
      const parsed = JSON.parse(fallbackText) as { message?: string | string[] };
      parsedMessage = Array.isArray(parsed.message) ? parsed.message[0] : parsed.message;
    } catch {
      // El cuerpo no era JSON, se usa el texto crudo como fallback.
    }
    throw new Error(parsedMessage || fallbackText || `HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

// Listado de productos (24/10/2026, pedido explicito): se agrego para la
// pestana "Imagenes". Con `ids` pide esos productos puntuales -- el
// listado general trae como mucho 100 ordenados por nombre, y podia dejar
// afuera productos de id bajo (ver bug reportado: "salio solo 1 de 10").
export async function listProducts(ids?: number[]): Promise<GabyProduct[]> {
  const query = ids && ids.length ? `?ids=${ids.join(",")}` : "";
  const response = await fetch(`${API_BASE_URL}/gaby/products${query}`, { cache: "no-store" });
  const raw = await readJson<{ items: RawGabyProduct[] }>(response);
  return raw.items.map(mapProduct);
}

export async function findProductByBarcode(barcode: string): Promise<ProductResponse> {
  const normalizedBarcode = normalizeBarcode(barcode);

  const response = await fetch(`${API_BASE_URL}/gaby/products/barcode/${encodeURIComponent(normalizedBarcode)}`, {
    cache: "no-store"
  });
  const raw = await readJson<RawProductResponse>(response);
  return { item: mapProduct(raw.item) };
}

export async function createProduct(barcode: string, name: string, price: number, stock?: number): Promise<ProductResponse> {
  const response = await fetch(`${API_BASE_URL}/gaby/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ barcode: normalizeBarcode(barcode), name, price, ...(stock !== undefined ? { stock } : {}) })
  });

  const raw = await readJson<RawProductResponse>(response);
  return { item: mapProduct(raw.item) };
}

export async function updateProduct(productId: number, name: string, price: number, stock?: number): Promise<ProductResponse> {
  const response = await fetch(`${API_BASE_URL}/gaby/products/${productId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name, price, ...(stock !== undefined ? { stock } : {}) })
  });

  const raw = await readJson<RawProductResponse>(response);
  return { item: mapProduct(raw.item) };
}

export async function createSale(items: CartItem[], paymentMethod: GabyPaymentMethod) {
  const response = await fetch(`${API_BASE_URL}/gaby/sales`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      paymentMethod,
      items: items.map((item) => ({
        // Los ids negativos son lineas manuales locales (sin codigo, nunca guardadas
        // como producto real): el backend los recibe sin productId.
        productId: item.productId > 0 ? item.productId : null,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        imageUrl: item.imageUrl
      }))
    })
  });

  return readJson<SaleResponse>(response);
}

export async function getSalesSummary(date?: string): Promise<GabySalesSummary> {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  const response = await fetch(`${API_BASE_URL}/gaby/sales/summary${query}`, { cache: "no-store" });
  return readJson<GabySalesSummary>(response);
}

// Clientes / cuenta corriente (06/10/2026): "Fiar" en vez de "Cobrar" --
// version simple, sin pagos parciales.
type ClientListResponse = GabyClient[];
type AccountEntryListResponse = GabyAccountEntry[];

export async function listClients(): Promise<GabyClient[]> {
  const response = await fetch(`${API_BASE_URL}/gaby/clients`, { cache: "no-store" });
  return readJson<ClientListResponse>(response);
}

export async function createClient(name: string, phone?: string, address?: string): Promise<GabyClient> {
  const response = await fetch(`${API_BASE_URL}/gaby/clients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, phone, address })
  });
  return readJson<GabyClient>(response);
}

export async function deleteClient(clientId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/gaby/clients/${clientId}`, { method: "DELETE" });
  await readJson<{ ok: true }>(response);
}

export async function listAccountEntries(clientId?: number): Promise<GabyAccountEntry[]> {
  const query = clientId ? `?clientId=${clientId}` : "";
  const response = await fetch(`${API_BASE_URL}/gaby/account-entries${query}`, { cache: "no-store" });
  return readJson<AccountEntryListResponse>(response);
}

export async function createAccountEntry(
  clientId: number,
  total: number,
  items: { productName: string; quantity: number; unitPrice: number }[],
  saleId?: number
): Promise<GabyAccountEntry> {
  const response = await fetch(`${API_BASE_URL}/gaby/account-entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, total, items, saleId })
  });
  return readJson<GabyAccountEntry>(response);
}

export async function settleAccount(clientId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/gaby/account-entries/client/${clientId}`, { method: "DELETE" });
  await readJson<{ ok: true }>(response);
}

// Pestana "Tickets" (Modo Pro, 24/10/2026): productos con codigo de barras
// inventado para imprimir en la tiquetera. Editar = updateProduct.

// Pestana Stock (07/11/2026). Sin texto: solo los que tienen stock cargado.
export async function listStock(search?: string): Promise<GabyProduct[]> {
  const query = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  const response = await fetch(`${API_BASE_URL}/gaby/stock${query}`, { cache: "no-store" });
  const raw = await readJson<{ items: RawGabyProduct[] }>(response);
  return raw.items.map(mapProduct);
}

export async function setProductStock(productId: number, stock: number): Promise<GabyProduct> {
  const response = await fetch(`${API_BASE_URL}/gaby/products/${productId}/stock`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stock })
  });
  const raw = await readJson<RawProductResponse>(response);
  return mapProduct(raw.item);
}
