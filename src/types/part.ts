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
  isIssued?: boolean;
  issuedInfo?: {
    workOrder?: string;
    aircraftReg?: string;
    receiver?: string;
    usedLife: number;
    issueTime: string;
  };
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
  usedLife?: number;
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

export const RETURN_REASON_STATUS_MAP: Record<
  ReturnReason,
  { status: PartStatus; reason: string; needException: boolean; exceptionDesc: string }
> = {
  life_expired: {
    status: 'unavailable',
    reason: '正常寿命到限退库，不可发料',
    needException: false,
    exceptionDesc: '',
  },
  fault: {
    status: 'pending',
    reason: '故障拆下，待工程判定',
    needException: true,
    exceptionDesc: '该件因故障拆下退库，需工程部门评估故障原因后决定处理方式',
  },
  wrong_issue: {
    status: 'pending',
    reason: '错发退回，待重新处理',
    needException: true,
    exceptionDesc: '该件因错发退回库房，需核实后重新安排发料',
  },
  for_repair: {
    status: 'pending',
    reason: '待送修，暂停发料',
    needException: true,
    exceptionDesc: '该件待送修退库，需安排送修并跟踪维修进度',
  },
};
