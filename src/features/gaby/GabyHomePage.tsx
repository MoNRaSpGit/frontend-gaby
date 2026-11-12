import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { createAccountEntry, createProduct, createSale, findProductByBarcode, listClients, normalizeBarcode, updateProduct } from "./gaby.api";
import { ManualProductModal } from "./components/ManualProductModal";
import { ScannerCart } from "./components/ScannerCart";
import { ScannerCheckout } from "./components/ScannerCheckout";
import { ScannerInput } from "./components/ScannerInput";
import { ScannerQuickAddModal } from "./components/ScannerQuickAddModal";
import { SelectClientModal } from "./components/SelectClientModal";
import { useGabyCart } from "./hooks/useGabyCart";
import type { GabyClient } from "./gaby.types";
import { ClientesScreen } from "./screens/ClientesScreen";
import { GabyDashboardScreen } from "./screens/GabyDashboardScreen";
import { MesScreen } from "./screens/MesScreen";
import { setAppBusy } from "../../shared/state/appActivity";

// Gaby Almacen (07/11/2026): version BASICA de Piloto -- escaner, venta,
// "fiar" a la cuenta corriente de un cliente. Sin cajas, sin modo Pro, sin
// tablet del fondo, sin precios/tickets ni impresion (la clienta pidio solo
// lo basico). Pestanas: Productos, Clientes y Panel. La pestana Stock se oculto (el codigo
// de StockScreen.tsx sigue en el repo para cuando se use).
type GabyTopTab = "productos" | "clientes" | "panel" | "mes";

const NOT_FOUND_MESSAGE = "Producto no encontrado.";
// No se elige medio de pago en la UI: se manda siempre este valor fijo.
const FIXED_PAYMENT_METHOD = "efectivo" as const;
// Atajo de teclado (igual que Piloto): cualquier flecha abre "Producto
// manual". Izquierda/derecha dentro de un campo editable se ignoran (para
// poder mover el cursor); arriba/abajo abren el modal igual.
const DOMINANT_ARROW_KEYS = new Set(["ArrowUp", "ArrowDown"]);
const ARROW_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

// Se guarda la pestana elegida y se restaura al refrescar.
const ACTIVE_TAB_STORAGE_KEY = "gaby-active-top-tab";

function loadStoredTopTab(): GabyTopTab | null {
  try {
    const stored = window.localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
    return stored === "productos" || stored === "clientes" || stored === "panel" || stored === "mes" ? stored : null;
  } catch {
    return null;
  }
}

export function GabyHomePage() {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [focusSignal, setFocusSignal] = useState(0);
  const [quickAddBarcode, setQuickAddBarcode] = useState<string | null>(null);
  const [isManualOpen, setIsManualOpen] = useState(false);
  // Vive aca (no adentro de ScannerCart) para que el efecto de mas abajo se
  // entere de cuando este modal se abre/cierra y devuelva el foco al escaner.
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [activeTopTab, setActiveTopTab] = useState<GabyTopTab>(() => loadStoredTopTab() ?? "productos");
  const [fiarClients, setFiarClients] = useState<GabyClient[] | null>(null);
  const [isFiarSubmitting, setIsFiarSubmitting] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTopTab);
    } catch {
      // ignore
    }
  }, [activeTopTab]);

  const { cartItems, lastScannedProductId, addProduct, addManualItem, addOne, removeOne, updateItem, clearCart, total } = useGabyCart();

  // Al cerrarse cualquier modal, el foco vuelve al input del escaner para
  // seguir escaneando sin tocar el mouse.
  useEffect(() => {
    if (!isCheckoutOpen && !quickAddBarcode && !isManualOpen && editingProductId === null) {
      setFocusSignal((signal) => signal + 1);
    }
  }, [isCheckoutOpen, quickAddBarcode, isManualOpen, editingProductId]);

  // Le avisa a AppUpdateNotice si es seguro actualizar solo: "ocupada" =
  // hay productos cargados o algun modal abierto.
  const hasPendingProducts = cartItems.length > 0;
  useEffect(() => {
    setAppBusy(hasPendingProducts || isCheckoutOpen || !!quickAddBarcode || isManualOpen || editingProductId !== null || fiarClients !== null);
    return () => setAppBusy(false);
  }, [hasPendingProducts, isCheckoutOpen, quickAddBarcode, isManualOpen, editingProductId, fiarClients]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!ARROW_KEYS.has(event.key)) return;
      if (activeTopTab !== "productos") return;

      const target = event.target as HTMLElement | null;
      const isEditable =
        !!target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
      if (isEditable && !DOMINANT_ARROW_KEYS.has(event.key)) return;
      if (isCheckoutOpen || quickAddBarcode || editingProductId !== null || fiarClients !== null) return;

      // Que la flecha no mueva el foco entre botones ni haga scroll.
      event.preventDefault();
      setIsManualOpen(true);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTopTab, isCheckoutOpen, quickAddBarcode, editingProductId, fiarClients]);

  function handleEmptyEnter() {
    if (!cartItems.length) return;
    setIsCheckoutOpen(true);
  }

  // Los botones del carrito le sacan el foco al buscador: se reenfoca para
  // seguir escaneando sin tocar el mouse.
  function handleRemoveOne(productId: number) {
    removeOne(productId);
    setFocusSignal((signal) => signal + 1);
  }

  function handleAddOne(productId: number) {
    addOne(productId);
    setFocusSignal((signal) => signal + 1);
  }

  async function handleSearch(barcode: string) {
    setIsLoading(true);
    setError("");

    try {
      const response = await findProductByBarcode(barcode);
      addProduct(response.item);
    } catch (searchError) {
      const message = searchError instanceof Error ? searchError.message : "No se pudo buscar el producto.";
      if (message === NOT_FOUND_MESSAGE) {
        setQuickAddBarcode(normalizeBarcode(barcode));
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
      setBarcodeInput("");
    }
  }

  async function handleQuickAddConfirm(name: string, price: number, stock?: number) {
    if (!quickAddBarcode) return false;

    try {
      const response = await createProduct(quickAddBarcode, name, price, stock);
      addProduct(response.item);
      setQuickAddBarcode(null);
      setFocusSignal((signal) => signal + 1);
      return true;
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : "No se pudo guardar el producto.");
      return false;
    }
  }

  async function handleEditCartItem(productId: number, changes: { name: string; price: number; stock?: number }) {
    // Ids negativos son lineas manuales locales (sin producto real en el
    // catalogo): solo se actualiza el carrito, no hay nada que guardar.
    if (productId <= 0) {
      updateItem(productId, { name: changes.name, price: changes.price });
      return true;
    }

    try {
      await updateProduct(productId, changes.name, changes.price, changes.stock);
      updateItem(productId, changes);
      toast.success("Producto actualizado.");
      return true;
    } catch (updateError) {
      toast.error(updateError instanceof Error ? updateError.message : "No se pudo guardar el producto.");
      return false;
    }
  }

  function handleManualConfirm(price: number) {
    addManualItem(price, "Producto Manual");
    setIsManualOpen(false);
  }

  async function handleCharge() {
    try {
      await createSale(cartItems, FIXED_PAYMENT_METHOD);
      clearCart();
      toast.success("Venta confirmada.");
      return true;
    } catch (chargeError) {
      toast.error(chargeError instanceof Error ? chargeError.message : "No se pudo confirmar la venta.");
      return false;
    }
  }

  // "Fiar": boton aparte de "Cobrar". La venta queda con paymentMethod
  // "credito" y aparte se carga una boleta a la cuenta del cliente elegido
  // -- dos pedidos HTTP seguidos: si el segundo fallara, la venta ya quedo
  // confirmada (se avisa aparte).
  async function handleOpenFiar() {
    try {
      const clients = await listClients();
      setFiarClients(clients);
    } catch (fiarError) {
      toast.error(fiarError instanceof Error ? fiarError.message : "No se pudieron cargar los clientes.");
    }
  }

  async function handleConfirmFiar(clientId: number) {
    setIsFiarSubmitting(true);
    try {
      const itemsForEntry = cartItems.map((item) => ({ productName: item.name, quantity: item.quantity, unitPrice: item.price }));
      const saleTotal = total;
      const { item: sale } = await createSale(cartItems, "credito");
      try {
        await createAccountEntry(clientId, saleTotal, itemsForEntry, sale.id);
      } catch (entryError) {
        toast.error(
          entryError instanceof Error
            ? `La venta se guardo pero no se cargo en la cuenta del cliente: ${entryError.message}`
            : "La venta se guardo pero no se cargo en la cuenta del cliente."
        );
        clearCart();
        setFiarClients(null);
        return;
      }
      clearCart();
      setFiarClients(null);
      toast.success("Venta a credito registrada.");
    } catch (chargeError) {
      toast.error(chargeError instanceof Error ? chargeError.message : "No se pudo registrar la venta a credito.");
    } finally {
      setIsFiarSubmitting(false);
    }
  }

  return (
    <main className={activeTopTab === "clientes" ? "gaby-shell gaby-shell--wide" : "gaby-shell"}>
      <header className="gaby-header gaby-header--with-nav">
        <span className="gaby-kicker">Gaby Almacén</span>

        <nav className="gaby-header-nav" role="tablist" aria-label="Secciones">
          <button
            type="button"
            role="tab"
            aria-selected={activeTopTab === "productos"}
            className={activeTopTab === "productos" ? "gaby-header-nav-tab is-active" : "gaby-header-nav-tab"}
            onClick={() => setActiveTopTab("productos")}
          >
            Productos
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTopTab === "clientes"}
            className={activeTopTab === "clientes" ? "gaby-header-nav-tab is-active" : "gaby-header-nav-tab"}
            onClick={() => setActiveTopTab("clientes")}
          >
            Clientes
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTopTab === "panel"}
            className={activeTopTab === "panel" ? "gaby-header-nav-tab is-active" : "gaby-header-nav-tab"}
            onClick={() => setActiveTopTab("panel")}
          >
            Panel
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTopTab === "mes"}
            className={activeTopTab === "mes" ? "gaby-header-nav-tab is-active" : "gaby-header-nav-tab"}
            onClick={() => setActiveTopTab("mes")}
          >
            Mes
          </button>
        </nav>
      </header>

      {activeTopTab === "clientes" ? (
        <ClientesScreen onClose={() => setActiveTopTab("productos")} />
      ) : activeTopTab === "panel" ? (
        <GabyDashboardScreen />
      ) : activeTopTab === "mes" ? (
        <MesScreen />
      ) : (
        <>
          <ScannerInput
            value={barcodeInput}
            onChange={setBarcodeInput}
            onSubmit={handleSearch}
            onEmptyEnter={handleEmptyEnter}
            isLoading={isLoading}
            error={error}
            focusSignal={focusSignal}
          />

          <button type="button" className="gaby-manual-btn" onClick={() => setIsManualOpen(true)}>
            Producto Manual
          </button>

          {cartItems.length ? (
            <>
              <ScannerCart
                items={cartItems}
                lastScannedProductId={lastScannedProductId}
                onAddOne={handleAddOne}
                onRemoveOne={handleRemoveOne}
                onEdit={handleEditCartItem}
                editingProductId={editingProductId}
                onSetEditingProductId={setEditingProductId}
              />
              <ScannerCheckout
                total={total}
                isOpen={isCheckoutOpen}
                onOpen={() => setIsCheckoutOpen(true)}
                onClose={() => setIsCheckoutOpen(false)}
                onCharge={handleCharge}
                onFiar={() => void handleOpenFiar()}
              />
            </>
          ) : (
            <section className="gaby-empty-state">
              <p>Todavia no escaneaste ningun producto.</p>
            </section>
          )}

          {quickAddBarcode ? (
            <ScannerQuickAddModal barcode={quickAddBarcode} onClose={() => setQuickAddBarcode(null)} onConfirm={handleQuickAddConfirm} />
          ) : null}

          {isManualOpen ? <ManualProductModal title="Producto Manual" onClose={() => setIsManualOpen(false)} onConfirm={handleManualConfirm} /> : null}

          {fiarClients !== null ? (
            <SelectClientModal
              clients={fiarClients}
              total={total}
              isSubmitting={isFiarSubmitting}
              onClose={() => setFiarClients(null)}
              onConfirm={handleConfirmFiar}
            />
          ) : null}
        </>
      )}
    </main>
  );
}
