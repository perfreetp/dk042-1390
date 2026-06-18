import React, { useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { usePart } from '@/store/PartContext';
import { TRANSACTION_TYPE_TEXT } from '@/types/part';
import StatusBadge from '@/components/StatusBadge';
import styles from './index.module.scss';
import classnames from 'classnames';

const DetailPage: React.FC = () => {
  const router = useRouter();
  const { getPartById, transactions } = usePart();
  const partId = router.params.id;

  const part = useMemo(() => (partId ? getPartById(partId) : undefined), [partId, getPartById]);
  const partTransactions = useMemo(
    () => transactions.filter(t => t.partId === partId),
    [transactions, partId]
  );

  if (!part) {
    return (
      <View className={styles.page}>
        <View style={{ padding: 100, textAlign: 'center' }}>
          <Text style={{ color: '#86909C' }}>未找到该寿命件信息</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.headerCard}>
        <Text className={styles.headerPartNumber}>{part.partNumber}</Text>
        <Text className={styles.headerSerial}>序号：{part.serialNumber}</Text>
        <View className={styles.headerTagRow}>
          {part.isIssued && (
            <View className={styles.headerIssuedTag}>
              <Text className={styles.headerIssuedTagText}>已发出</Text>
            </View>
          )}
          <StatusBadge status={part.status} />
        </View>
      </View>

      <View className={styles.contentWrap}>
        <View className={styles.infoCard}>
          <View className={styles.lifeSummary}>
            <View className={styles.summaryItem}>
              <Text className={styles.summaryValue}>{part.remainingLife}</Text>
              <Text className={styles.summaryUnit}>{part.lifeUnit}</Text>
              <Text className={styles.summaryLabel}>剩余寿命</Text>
            </View>
            <View className={styles.summaryDivider} />
            <View className={styles.summaryItem}>
              <Text
                className={styles.summaryValue}
                style={{ fontSize: 28, color: '#1D2129', marginTop: 6 }}
              >
                {part.storageExpiryDate}
              </Text>
              <Text className={styles.summaryLabel} style={{ marginTop: 16 }}>封存到期日</Text>
            </View>
            <View className={styles.summaryDivider} />
            <View className={styles.summaryItem}>
              <Text
                className={styles.summaryValue}
                style={{ fontSize: 28, color: '#1D2129', marginTop: 6 }}
              >
                {part.location || '-'}
              </Text>
              <Text className={styles.summaryLabel} style={{ marginTop: 16 }}>当前库位</Text>
            </View>
          </View>
        </View>

        <View className={styles.infoCard}>
          <Text className={styles.cardTitle}>
            <View className={styles.cardTitleIcon} />
            基础信息
          </Text>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>件号</Text>
            <Text className={styles.infoValue}>{part.partNumber}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>序号</Text>
            <Text className={styles.infoValue}>{part.serialNumber}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>批次号</Text>
            <Text className={styles.infoValue}>{part.batchNumber}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>随件证书号</Text>
            <Text className={styles.infoValue}>{part.certificateNumber}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>入库时间</Text>
            <Text className={styles.infoValue}>{part.createTime}</Text>
          </View>
          {part.isIssued && part.issuedInfo && (
            <>
              <View className={styles.infoRow}>
                <Text className={styles.infoLabel}>领料人</Text>
                <Text className={styles.infoValue}>{part.issuedInfo.receiver || '-'}</Text>
              </View>
              <View className={styles.infoRow}>
                <Text className={styles.infoLabel}>工单/飞机</Text>
                <Text className={styles.infoValue}>
                  {part.issuedInfo.workOrder || part.issuedInfo.aircraftReg || '-'}
                </Text>
              </View>
              <View className={styles.infoRow}>
                <Text className={styles.infoLabel}>本次消耗</Text>
                <Text className={styles.infoValue}>
                  {part.issuedInfo.usedLife} {part.lifeUnit}
                </Text>
              </View>
              <View className={styles.infoRow}>
                <Text className={styles.infoLabel}>发出时间</Text>
                <Text className={styles.infoValue}>{part.issuedInfo.issueTime}</Text>
              </View>
            </>
          )}
          {part.statusReason && (
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>状态说明</Text>
              <Text
                className={styles.infoValue}
                style={{ color: part.isIssued ? '#1E64C8' : '#FF7D00' }}
              >
                {part.statusReason}
              </Text>
            </View>
          )}
        </View>

        <View className={styles.infoCard}>
          <Text className={styles.cardTitle}>
            <View className={styles.cardTitleIcon} />
            操作记录
          </Text>
          {partTransactions.length > 0 ? (
            partTransactions.map(t => (
              <View key={t.id} className={styles.historyItem}>
                <View
                  className={styles.historyDot}
                  style={{
                    background:
                      t.type === 'inbound'
                        ? '#1E64C8'
                        : t.type === 'outbound'
                        ? '#00B42A'
                        : '#FF7D00',
                  }}
                />
                <View className={styles.historyContent}>
                  <Text
                    className={classnames(
                      styles.historyType,
                      t.type === 'inbound' && styles.typeInbound,
                      t.type === 'outbound' && styles.typeOutbound,
                      t.type === 'return' && styles.typeReturn
                    )}
                  >
                    {TRANSACTION_TYPE_TEXT[t.type]}
                  </Text>
                  <Text className={styles.historyDesc}>
                    {t.type === 'outbound' && t.workOrder
                      ? `工单号：${t.workOrder}`
                      : t.type === 'outbound' && t.aircraftReg
                      ? `飞机号：${t.aircraftReg}`
                      : t.type === 'return' && t.returnReason
                      ? `退回原因：${
                          t.returnReason === 'life_expired'
                            ? '正常寿命到限'
                            : t.returnReason === 'fault'
                            ? '故障拆下'
                            : t.returnReason === 'wrong_issue'
                            ? '错发退回'
                            : '待送修'
                        }`
                      : '寿命件入库登记'}
                    {t.receiver && ` | 领料人：${t.receiver}`}
                  </Text>
                  <Text className={styles.historyTime}>
                    {t.operator} · {t.operateTime}
                  </Text>
                  {t.remark && (
                    <Text className={styles.historyTime}>备注：{t.remark}</Text>
                  )}
                </View>
              </View>
            ))
          ) : (
            <Text className={styles.emptyHistory}>暂无操作记录</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

export default DetailPage;
