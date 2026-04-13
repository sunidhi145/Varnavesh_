import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartItem = {
  productId: string;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  addItem: (productId: string, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
};

const storageKey = "varnavesh-cart-v1";
const CartContext = createContext<CartContextValue | undefined>(undefined);

function readStoredCart() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey);
    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue) as CartItem[];
    return parsedValue.filter(
      (item) => typeof item.productId === "string" && Number.isInteger(item.quantity) && item.quantity > 0,
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => readStoredCart());

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items]);

  const value = useMemo<CartContextValue>(() => {
    const addItem = (productId: string, quantity = 1) => {
      setItems((currentItems) => {
        const existingItem = currentItems.find((item) => item.productId === productId);

        if (!existingItem) {
          return [...currentItems, { productId, quantity }];
        }

        return currentItems.map((item) =>
          item.productId === productId ? { ...item, quantity: Math.min(item.quantity + quantity, 10) } : item,
        );
      });
    };

    const removeItem = (productId: string) => {
      setItems((currentItems) => currentItems.filter((item) => item.productId !== productId));
    };

    const updateQuantity = (productId: string, quantity: number) => {
      if (quantity <= 0) {
        setItems((currentItems) => currentItems.filter((item) => item.productId !== productId));
        return;
      }

      setItems((currentItems) =>
        currentItems.map((item) =>
          item.productId === productId ? { ...item, quantity: Math.max(1, Math.min(quantity, 10)) } : item,
        ),
      );
    };

    const clearCart = () => {
      setItems([]);
    };

    return {
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within a CartProvider.");
  }

  return context;
}
