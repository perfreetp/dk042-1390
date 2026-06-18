export type PartStatus = 'available' | 'pending' | 'unavailable';

export type ReturnReason = 'life_expired' | 'fault' | 'wrong_issue' | 'for_repair';

export type TransactionType = 'inbound' | 'outbound' | 'return';

export interface LifePart {
  id: string;
  partNumber: string;
  serialNumber: string;
  batchNumber: string;
  remainingLife: number;
  lifeUnit: string;
  certificateNumber: string;
  storageExpiryDate: string;
  status: PartStatus;
  statusReason?: string;
  location?: string;
  createTime: string;
  updateTime: string;
}

export interface TransactionRecord {
  id: string;
  partId: string;
  type: TransactionType;
  partNumber: string;
  serialNumber: string;
  operator: string;
  operateTime: string;
  workOrder?: string;
  aircraftReg?: string;
  receiver?: string;
  cabinet?: string;
  certificateAttached?: boolean;
  returnReason?: ReturnReason;
  remark?: string;
}

export interface ExceptionRecord {
  id: string;
  partId: string;
  partNumber: string;
  serialNumber: string;
  type: string;
  description: string;
  status: 'pending' | 'resolved';
  createTime: string;
  handler?: string;
  resolveTime?: string;
  resolveNote?: string;
}

export const STATUS_TEXT: Record<PartStatus, string> = {
  available: '可用',
  pending: '待工程判定',
  unavailable: '不可发料',
};

export const RETURN_REASON_TEXT: Record<ReturnReason, string> = {
  life_expired: '正常寿命到限',
  fault: '故障拆下',
  wrong_issue: '错发退回',
  for_repair: '待送修',
};

export const TRANSACTION_TYPE_TEXT: Record<TransactionType, string> = {
  inbound: '入库',
  outbound: '出库',
  return: '退库',
};
