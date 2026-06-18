import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import Taro from '@tarojs/taro';
import {
  LifePart,
  TransactionRecord,
  ExceptionRecord,
  PartStatus,
  ReturnReason,
  RETURN_REASON_STATUS_MAP,
  RETURN_REASON_TEXT,
} from '@/types/part';
import { mockParts, mockTransactions, mockExceptions } from '@/data/mockData';

const STORAGE_KEY = 'life_part_data_v1';

interface PersistData {
  parts: LifePart[];
  transactions: TransactionRecord[];
  exceptions: ExceptionRecord[];
}

interface PartContextType {
  parts: LifePart[];
  transactions: TransactionRecord[];
  exceptions: ExceptionRecord[];
  addPart: (part: Omit<LifePart, 'id' | 'createTime' | 'updateTime'>) => void;
  issuePart: (
    partId: string,
    usedLife: number,
    record: Omit<TransactionRecord, 'id' | 'operateTime' | 'type'>
  ) => void;
  returnPart: (
    partId: string,
    reason: ReturnReason,
    record: Omit<TransactionRecord, 'id' | 'operateTime' | 'type'>
  ) => void;
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

const nowStr = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

const loadPersisted = (): PersistData => {
  try {
    const raw = Taro.getStorageSync(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistData;
      if (parsed.parts && parsed.transactions && parsed.exceptions) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('[PartContext] 读取本地数据失败:', e);
  }
  return {
    parts: mockParts,
    transactions: mockTransactions,
    exceptions: mockExceptions,
  };
};

export const PartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const initial = loadPersisted();
  const [parts, setParts] = useState<LifePart[]>(initial.parts);
  const [transactions, setTransactions] = useState<TransactionRecord[]>(initial.transactions);
  const [exceptions, setExceptions] = useState<ExceptionRecord[]>(initial.exceptions);

  useEffect(() => {
    try {
      Taro.setStorageSync(
        STORAGE_KEY,
        JSON.stringify({ parts, transactions, exceptions })
      );
    } catch (e) {
      console.error('[PartContext] 写入本地数据失败:', e);
    }
  }, [parts, transactions, exceptions]);

  const evaluateStatus = useCallback(
    (data: {
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
    },
    []
  );

  const addPart = useCallback((partData: Omit<LifePart, 'id' | 'createTime' | 'updateTime'>) => {
    const now = nowStr();
    const newPart: LifePart = {
      ...partData,
      id: 'P' + String(Date.now()).slice(-6),
      createTime: now,
      updateTime: now,
    };
    setParts(prev => [newPart, ...prev]);
    setTransactions(prev => [
      {
        id: 'T' + String(Date.now()).slice(-6),
        partId: newPart.id,
        type: 'inbound',
        partNumber: newPart.partNumber,
        serialNumber: newPart.serialNumber,
        operator: '当前用户',
        operateTime: now,
      },
      ...prev,
    ]);
    console.log('[PartContext] 新增寿命件入库:', newPart.id, newPart.partNumber);
  }, []);

  const issuePart = useCallback(
    (
      partId: string,
      usedLife: number,
      record: Omit<TransactionRecord, 'id' | 'operateTime' | 'type'>
    ) => {
      const now = nowStr();
      setParts(prev =>
        prev.map(p => {
          if (p.id !== partId) return p;
          const newRemaining = Math.max(0, p.remainingLife - usedLife);
          return {
            ...p,
            remainingLife: newRemaining,
            isIssued: true,
            status: 'unavailable',
            statusReason: `已发出，消耗寿命 ${usedLife}${p.lifeUnit}，剩余 ${newRemaining}${p.lifeUnit}`,
            issuedInfo: {
              workOrder: record.workOrder,
              aircraftReg: record.aircraftReg,
              receiver: record.receiver,
              usedLife,
              issueTime: now,
            },
            updateTime: now,
          };
        })
      );
      setTransactions(prev => [
        {
          ...record,
          id: 'T' + String(Date.now()).slice(-6),
          type: 'outbound',
          operateTime: now,
          usedLife,
        },
        ...prev,
      ]);
      console.log('[PartContext] 寿命件出库:', partId, '消耗', usedLife);
    },
    []
  );

  const returnPart = useCallback(
    (
      partId: string,
      reason: ReturnReason,
      record: Omit<TransactionRecord, 'id' | 'operateTime' | 'type'>
    ) => {
      const now = nowStr();
      const reasonMap = RETURN_REASON_STATUS_MAP[reason];
      const target = parts.find(p => p.id === partId);
      setParts(prev =>
        prev.map(p =>
          p.id === partId
            ? {
                ...p,
                status: reasonMap.status,
                statusReason: reasonMap.reason,
                isIssued: false,
                issuedInfo: undefined,
                updateTime: now,
              }
            : p
        )
      );
      setTransactions(prev => [
        {
          ...record,
          id: 'T' + String(Date.now()).slice(-6),
          type: 'return',
          operateTime: now,
          returnReason: reason,
        },
        ...prev,
      ]);
      if (reasonMap.needException && target) {
        setExceptions(prev => [
          {
            id: 'E' + String(Date.now()).slice(-6),
            partId,
            partNumber: target.partNumber,
            serialNumber: target.serialNumber,
            type: `${RETURN_REASON_TEXT[reason]}退库`,
            description: reasonMap.exceptionDesc,
            status: 'pending',
            createTime: now,
          },
          ...prev,
        ]);
      }
      console.log('[PartContext] 寿命件退库:', partId, '原因:', reason);
    },
    [parts]
  );

  const addTransaction = useCallback((record: Omit<TransactionRecord, 'id' | 'operateTime'>) => {
    const now = nowStr();
    setTransactions(prev => [
      { ...record, id: 'T' + String(Date.now()).slice(-6), operateTime: now },
      ...prev,
    ]);
    console.log('[PartContext] 新增操作记录:', record.type);
  }, []);

  const resolveException = useCallback((id: string, handler: string, note: string) => {
    const now = nowStr();
    setExceptions(prev =>
      prev.map(e =>
        e.id === id
          ? { ...e, status: 'resolved', handler, resolveTime: now, resolveNote: note }
          : e
      )
    );
    console.log('[PartContext] 异常已处理:', id);
  }, []);

  const getPartById = useCallback(
    (id: string) => parts.find(p => p.id === id),
    [parts]
  );

  const getPartBySerial = useCallback(
    (serial: string) => parts.find(p => p.serialNumber === serial),
    [parts]
  );

  return (
    <PartContext.Provider
      value={{
        parts,
        transactions,
        exceptions,
        addPart,
        issuePart,
        returnPart,
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
