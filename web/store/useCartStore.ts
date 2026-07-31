"use client";

import { create } from "zustand";
import type { Product, CartItem } from "@shared/types";

function clampToStock(quantity: number, stock: number) {
  return Math.min(Math.max(0, quantity), Math.max(0, stock));
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  isOpen: false,

  addItem: (product, quantity = 1) =>
    set((state) => {
      if (product.stock <= 0 || quantity <= 0) {
        return state;
      }

      const existing = state.items.find(
        (item) => item.product.id === product.id
      );
      const nextQuantity = clampToStock(
        (existing?.quantity ?? 0) + quantity,
        product.stock
      );

      if (nextQuantity <= 0) {
        return state;
      }

      if (existing) {
        if (existing.quantity === nextQuantity) {
          return { isOpen: true };
        }

        return {
          items: state.items.map((item) =>
            item.product.id === product.id
              ? { ...item, product, quantity: nextQuantity }
              : item
          ),
          isOpen: true,
        };
      }

      return {
        items: [...state.items, { product, quantity: nextQuantity }],
        isOpen: true,
      };
    }),

  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((item) => item.product.id !== productId),
    })),

  updateQuantity: (productId, quantity) =>
    set((state) => {
      const existing = state.items.find(
        (item) => item.product.id === productId
      );
      if (!existing) {
        return state;
      }

      const nextQuantity = clampToStock(quantity, existing.product.stock);

      if (nextQuantity <= 0) {
        return {
          items: state.items.filter((item) => item.product.id !== productId),
        };
      }

      if (existing.quantity === nextQuantity) {
        return state;
      }

      return {
        items: state.items.map((item) =>
          item.product.id === productId
            ? { ...item, quantity: nextQuantity }
            : item
        ),
      };
    }),

  clearCart: () => set({ items: [] }),

  toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

  openCart: () => set({ isOpen: true }),

  closeCart: () => set({ isOpen: false }),
}));
