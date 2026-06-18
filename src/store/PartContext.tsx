import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
} from 'react';
import Taro from '@tarojs/taro';
import {
  LifePart,
  TransactionRecord,
  ExceptionRecord,
  JudgmentRecord,
  PartStatus,
  ReturnReason,
  JudgmentResult,
  TimelineEventType,
  RETURN_REASON_STATUS_MAP,
  RETURN_REASON_TEXT,
  JUDGMENT_RESULT_TEXT,
  JUDGMENT_RESULT_STATUS_MAP,
  TRANSACTION_TYPE_TEXT,
} from '@/types/part';
import { mockParts, mockTransactions, mockExceptions } from '@/data/mockData';

const STORAGE_KEY = 'life_part_data_v2';

interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  time: string;
  title: string;
  desc: string;
  operator?: string;
  color: string;
}

interface PersistData {
  parts: LifePart[];
  transactions: TransactionRecord[];
  exceptions: ExceptionRecord[];
  judgments: JudgmentRecord[];
}

interface PartContextType {
  parts: LifePart[];
  transactions: TransactionRecord[];
  exceptions: ExceptionRecord[];
  judgments: JudgmentRecord[];
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
  judgePart: (
    partId: string,
    result: JudgmentResult,
    remark: string,
    operator: string,
    exceptionId?: string
  ) => void;
  addTransaction: (record: Omit<TransactionRecord, 'id' | 'operateTime'>) => void;
  resolveException: (id: string, handler: string, note: string) => void;
  getPartById: (id: string) => LifePart | undefined;
  getPartBySerial: (serial: string) => LifePart | undefined;
  getTimeline: (partId: string) => TimelineEvent[];
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
        return {
          parts: parsed.parts,
          transactions: parsed.transactions,
          exceptions: parsed.exceptions,
          judgments: parsed.judgments || [],
        };
      }
    }
  } catch (e) {
    console.error('[PartContext] 读取本地数据失败:', e);
  }
  return {
    parts: mockParts,
    transactions: mockTransactions,
    exceptions: mockExceptions,
    judgments: [],
  };
};

export const PartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const initial = loadPersisted();
  const [parts, setParts] = useState<LifePart[]>(initial.parts);
  const [transactions, setTransactions] = useState<TransactionRecord[]>(initial.transactions);
  const [exceptions, setExceptions] = useState<ExceptionRecord[]>(initial.exceptions);
  const [judgments, setJudgments] = useState<JudgmentRecord[]>(initial.judgments);

  useEffect(() => {
    try {
      Taro.setStorageSync(
        STORAGE_KEY,
        JSON.stringify({ parts, transactions, exceptions, judgments })
      );
    } catch (e) {
      console.error('[PartContext] 写入本地数据失败:', e);
    }
  }, [parts, transactions, exceptions, judgments]);

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
                lastJudgment: undefined,
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

  const judgePart = useCallback(
    (
      partId: string,
      result: JudgmentResult,
      remark: string,
      operator: string,
      exceptionId?: string
    ) => {
      const now = nowStr();
      const resultMap = JUDGMENT_RESULT_STATUS_MAP[result];
      const target = parts.find(p => p.id === partId);
      if (!target) return;

      const lifeCheck = evaluateStatus({
        remainingLife: target.remainingLife,
        lifeUnit: target.lifeUnit,
        storageExpiryDate: target.storageExpiryDate,
      });

      let newStatus: PartStatus;
      let newStatusReason: string;

      if (result === 'reissue') {
        if (lifeCheck.status === 'unavailable') {
          newStatus = 'unavailable';
          newStatusReason = `工程判定后${lifeCheck.reason}，仍不可发料`;
        } else {
          newStatus = 'available';
          newStatusReason = lifeCheck.reason
            ? `工程判定通过（${lifeCheck.reason}，请关注寿命风险）`
            : '工程判定通过，可正常发料';
        }
      } else if (result === 'quarantine') {
        newStatus = 'pending';
        newStatusReason = '工程判定继续隔离观察';
      } else {
        newStatus = 'unavailable';
        newStatusReason = '工程判定报废，不可发料';
      }

      if (remark) {
        newStatusReason += `（${remark}）`;
      }

      setParts(prev =>
        prev.map(p =>
          p.id === partId
            ? {
                ...p,
                status: newStatus,
                statusReason: newStatusReason,
                isIssued: false,
                issuedInfo: undefined,
                lastJudgment: {
                  result,
                  operator,
                  judgmentTime: now,
                  remark,
                },
                updateTime: now,
              }
            : p
        )
      );

      const targetExceptionId = exceptionId || exceptions.find(
        e => e.partId === partId && e.status === 'pending'
      )?.id;

      const record: JudgmentRecord = {
        id: 'J' + String(Date.now()).slice(-6),
        partId,
        exceptionId: targetExceptionId,
        result,
        operator,
        judgmentTime: now,
        remark,
        newStatus,
        newStatusReason,
      };
      setJudgments(prev => [record, ...prev]);

      if (targetExceptionId) {
        setExceptions(prev =>
          prev.map(e =>
            e.id === targetExceptionId
              ? {
                  ...e,
                  status: 'resolved',
                  handler: operator,
                  resolveTime: now,
                  resolveNote: `工程判定：${JUDGMENT_RESULT_TEXT[result]}。${remark}`,
                  judgmentResult: result,
                  judgmentRemark: remark,
                }
              : e
          )
        );
      }

      console.log('[PartContext] 工程判定:', partId, result, newStatus);
    },
    [parts, evaluateStatus, exceptions]
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

  const getTimeline = useCallback(
    (partId: string): TimelineEvent[] => {
      const events: TimelineEvent[] = [];

      transactions
        .filter(t => t.partId === partId)
        .forEach(t => {
          let desc = '';
          if (t.type === 'inbound') {
            desc = '寿命件入库登记';
          } else if (t.type === 'outbound') {
            const partInfo = parts.find(p => p.id === t.partId);
            const unit = partInfo?.lifeUnit || '';
            desc = `发往${t.workOrder || t.aircraftReg || '工单/飞机'}，领料人：${t.receiver || '-'}${
              t.usedLife ? `，消耗${t.usedLife}${unit}` : ''
            }`;
          } else if (t.type === 'return') {
            const reason = t.returnReason ? RETURN_REASON_TEXT[t.returnReason] : '';
            desc = `${reason}退库${t.remark ? '：' + t.remark : ''}`;
          }
          events.push({
            id: t.id,
            type: t.type,
            time: t.operateTime,
            title: TRANSACTION_TYPE_TEXT[t.type],
            desc,
            operator: t.operator,
            color:
              t.type === 'inbound'
                ? '#1E64C8'
                : t.type === 'outbound'
                ? '#00B42A'
                : '#FF7D00',
          });
        });

      exceptions
        .filter(e => e.partId === partId)
        .forEach(e => {
          events.push({
            id: e.id + '-c',
            type: 'exception_create',
            time: e.createTime,
            title: `异常：${e.type}`,
            desc: e.description,
            color: '#F53F3F',
          });
          if (e.status === 'resolved' && e.resolveTime) {
            events.push({
              id: e.id + '-r',
              type: 'exception_resolve',
              time: e.resolveTime,
              title: '异常已处理',
              desc: e.resolveNote || '',
              operator: e.handler,
              color: '#00B42A',
            });
          }
        });

      judgments
        .filter(j => j.partId === partId)
        .forEach(j => {
          events.push({
            id: j.id,
            type: 'judgment',
            time: j.judgmentTime,
            title: `工程判定：${JUDGMENT_RESULT_TEXT[j.result]}`,
            desc: j.remark || j.newStatusReason,
            operator: j.operator,
            color: '#722ED1',
          });
        });

      return events.sort((a, b) => (a.time < b.time ? 1 : -1));
    },
    [transactions, exceptions, judgments]
  );

  const value = useMemo(
    () => ({
      parts,
      transactions,
      exceptions,
      judgments,
      addPart,
      issuePart,
      returnPart,
      judgePart,
      addTransaction,
      resolveException,
      getPartById,
      getPartBySerial,
      getTimeline,
      evaluateStatus,
    }),
    [
      parts,
      transactions,
      exceptions,
      judgments,
      addPart,
      issuePart,
      returnPart,
      judgePart,
      addTransaction,
      resolveException,
      getPartById,
      getPartBySerial,
      getTimeline,
      evaluateStatus,
    ]
  );

  return <PartContext.Provider value={value}>{children}</PartContext.Provider>;
};

export const usePart = () => {
  const ctx = useContext(PartContext);
  if (!ctx) {
    throw new Error('usePart must be used within PartProvider');
  }
  return ctx;
};
