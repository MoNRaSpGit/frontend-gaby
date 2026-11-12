export type GabyProductStatus = "active" | "inactive";

export type GabyProduct = {
  id: number;
  name: string;
  barcode: string;
  price: number;
  stock: number;
  // true = ya se le cargo un stock a mano (aunque sea 0).
  stockTracked: boolean;
  imageUrl: string | null;
  status: GabyProductStatus;
  createdAt: string;
  updatedAt: string;
};

export type GabyPaymentMethod = "efectivo" | "tarjeta" | "credito";

export type GabySale = {
  id: number;
  totalAmount: number;
  itemsCount: number;
  paymentMethod: GabyPaymentMethod;
  createdAt: string;
};

export type CartItem = {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
  // Stock registrado del producto (null / sin definir = todavia no se cargo).
  stock?: number | null;
  // "Producto no encontrado" desde la tablet del fondo (03/11/2026): el
  // codigo que no estaba en el catalogo. Al editar esta linea en el
  // mostrador, en vez de solo renombrar el renglon, se crea el producto
  // de verdad con este codigo -- asi la proxima vez que se escanee, ya
  // se reconoce.
  pendingBarcode?: string | null;
};

// "Precios" -- Modo Pro (23/09/2026): lista de precios por categoria,
// independiente de los productos reales del escaner (GabyProduct).
export type GabyPriceCategory = "congelados" | "frutas_verduras" | "empanadas" | "otros";

export type GabyPriceEntry = {
  id: number;
  category: GabyPriceCategory;
  name: string;
  price: number;
  createdAt: string;
  updatedAt: string;
};

// "Panel de control" -- Modo Pro (24/09/2026): ventas, ganancia (30% de
// las ventas) y el detalle de cada venta del dia ("Movimientos").
export type GabySaleMovementItem = {
  name: string;
  quantity: number;
  // Pedido explicito (24/09/2026): "hacerle click a la venta que muestre
  // en detalle los productos, uno arriba del otro, con el precio".
  unitPrice: number;
  lineTotal: number;
};

export type GabySaleMovement = {
  id: number;
  displayNumber: number;
  createdAt: string;
  totalAmount: number;
  paymentMethod: GabyPaymentMethod;
  items: GabySaleMovementItem[];
};

export type GabySalesSummary = {
  date: string;
  salesCount: number;
  totalAmount: number;
  profitAmount: number;
  profitMarginRatio: number;
  sales: GabySaleMovement[];
};

// Clientes / cuenta corriente (06/10/2026): venta a credito ligada a un
// cliente. El saldo es siempre la suma de sus boletas (account entries)
// abiertas -- no hay un numero de saldo guardado aparte.
export type GabyClient = {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  createdAt: string;
};

export type GabyAccountEntryItem = {
  productName: string;
  quantity: number;
  unitPrice: number;
};

export type GabyAccountEntry = {
  id: number;
  clientId: number;
  saleId: number | null;
  total: number;
  items: GabyAccountEntryItem[];
  createdAt: string;
};

// Pestana "Mes" (misma idea que el Mes de El Joker).
export type GabyMonthDay = { fecha: string; diaSemana: string; total: number };
export type GabyMonthWeek = { numero: number; total: number; dias: GabyMonthDay[] };
export type GabyMonthSummary = {
  anio: number;
  mes: number;
  total: number;
  profitMarginRatio: number;
  semanas: GabyMonthWeek[];
};
export type GabyMonthHistoryItem = { anio: number; mes: number; total: number };
