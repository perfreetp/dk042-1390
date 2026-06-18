import React, { createContext, useContext, useState, ReactNode } from 'react';
import { LifePart, TransactionRecord, ExceptionRecord, PartStatus } from '@/types/part';
import { mockParts, mockTransactions, mockExceptions } from '@/data/mockData';

interface PartContextType {
  parts: LifePart[];
  transactions: TransactionRecord[];
  exceptions: ExceptionRecord[];
  addPart: (part: Omit<LifePart, 'id' | 'createTime' | 'updateTime'>) => void;
  addTransaction: (record: Omit<TransactionRecord, 'id' | 'operateTime'>) => void;
  resolveException: (id: string, handler: string, note: string) => void;
  getPartById: (id: string) => LifePart | undefined;
  getPartBySerial: (serial: string) => LifePart | undefined;
  evaluateStatus: (data: {
    remainingLife: number;
    lifeUnit: string;
    storageExpiryDate: string;
  }) => { status: PartStatus; reason?: string };
}

const PartContext = createContext<PartContextType | undefined>(undefined);

export const PartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [parts, setParts] = useState<LifePart[]>(mockParts);
  const [transactions, setTransactions] = useState<TransactionRecord[]>(mockTransactions);
  const [exceptions, setExceptions] = useState<ExceptionRecord[]>(mockExceptions);

  const evaluateStatus = (data: {
    remainingLife: number;
    lifeUnit: string;
    storageExpiryDate: string;
  }): { status: PartStatus; reason?: string } => {
    const now = new Date();
    const expiry = new Date(data.storageExpiryDate);
    const threshold = data.lifeUnit === 'CY' ? 300 : 500;
    const warnThreshold = data.lifeUnit === 'CY' ? 500 : 1000;

    if (expiry < now) {
      return { status: 'unavailable', reason: '封存已到期' };
    }
    if (data.remainingLife <= 0) {
      return { status: 'unavailable', reason: '寿命已到限' };
    }
    if (data.remainingLife < threshold) {
      return { status: 'pending', reason: '剩余寿命低于最低发料阈值' };
    }
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
    if (expiry < threeMonthsLater) {
      return { status: 'pending', reason: '封存期不足3个月' };
    }
    if (data.remainingLife < warnThreshold) {
      return { status: 'pending', reason: '剩余寿命接近警戒值' };
    }
    return { status: 'available' };
  };

  const addPart = (partData: Omit<LifePart, 'id' | 'createTime' | 'updateTime'>) => {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const newPart: LifePart = {
      ...partData,
      id: 'P' + String(Date.now()).slice(-6),
      createTime: now,
      updateTime: now,
    };
    setParts(prev => [newPart, ...prev]);
    addTransaction({
      partId: newPart.id,
      type: 'inbound',
      partNumber: newPart.partNumber,
      serialNumber: newPart.serialNumber,
      operator: '当前用户',
    });
    console.log('[PartContext] 新增寿命件入库:', newPart.id, newPart.partNumber);
  };

  const addTransaction = (record: Omit<TransactionRecord, 'id' | 'operateTime'>) => {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const newRecord: TransactionRecord = {
      ...record,
      id: 'T' + String(Date.now()).slice(-6),
      operateTime: now,
    };
    setTransactions(prev => [newRecord, ...prev]);
    console.log('[PartContext] 新增操作记录:', newRecord.id, newRecord.type);
  };

  const resolveException = (id: string, handler: string, note: string) => {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    setExceptions(prev =>
      prev.map(e =>
        e.id === id
          ? { ...e, status: 'resolved', handler, resolveTime: now, resolveNote: note }
          : e
      )
    );
    console.log('[PartContext] 异常已处理:', id);
  };

  const getPartById = (id: string) => parts.find(p => p.id === id);

  const getPartBySerial = (serial: string) => parts.find(p => p.serialNumber === serial);

  return (
    <PartContext.Provider
      value={{
        parts,
        transactions,
        exceptions,
        addPart,
        addTransaction,
        resolveException,
        getPartById,
        getPartBySerial,
        evaluateStatus,
      }}
    >
      {children}
    </PartContext.Provider>
  );
};

export const usePart = () => {
  const ctx = useContext(PartContext);
  if (!ctx) {
    throw new Error('usePart must be used within PartProvider');
  }
  return ctx;
};
