'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ModalState } from '@/types';

interface UIContextType {
  modal: ModalState;
  openModal: (type: ModalState['type'], taskId?: string) => void;
  closeModal: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalState>({ isOpen: false, type: null });

  const openModal = (type: ModalState['type'], taskId?: string) => {
    setModal({ isOpen: true, type, taskId });
  };

  const closeModal = () => {
    setModal({ isOpen: false, type: null, taskId: undefined });
  };

  return (
    <UIContext.Provider value={{ modal, openModal, closeModal }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
