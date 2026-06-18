import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { usePart } from '@/store/PartContext';
import { TRANSACTION_TYPE_TEXT } from '@/types/part';
import styles from './index.module.scss';
import classnames from 'classnames';

const TransactPage: React.FC = () => {
  const { parts, transactions } = usePart();

  const availableCount = parts.filter(p => p.status === 'available').length;
  const pendingCount = parts.filter(p => p.status === 'pending').length;
  const unavailableCount = parts.filter(p => p.status === 'unavailable').length;
  const recentList = transactions.slice(0, 5);

  const goTo = (url: string) => {
    Taro.navigateTo({ url });
  };

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.title}>寿命件收发</Text>
        <Text className={styles.subtitle}>扫码或录入件号，快速完成收发操作</Text>
      </View>

      <View className={styles.statsRow}>
        <View className={styles.statCard}>
          <Text className={classnames(styles.statValue, styles.available)}>{availableCount}</Text>
          <Text className={styles.statLabel}>可用</Text>
        </View>
        <View className={styles.statCard}>
          <Text className={classnames(styles.statValue, styles.pending)}>{pendingCount}</Text>
          <Text className={styles.statLabel}>待判定</Text>
        </View>
        <View className={styles.statCard}>
          <Text className={classnames(styles.statValue, styles.unavailable)}>{unavailableCount}</Text>
          <Text className={styles.statLabel}>不可发料</Text>
        </View>
      </View>

      <Text className={styles.sectionTitle}>快捷操作</Text>
      <View className={styles.actionGrid}>
        <View className={styles.actionCard} onClick={() => goTo('/pages/inbound/index')}>
          <View className={classnames(styles.actionIcon, styles.inboundIcon)}>入</View>
          <Text className={styles.actionText}>入库</Text>
          <Text className={styles.actionDesc}>扫描录入</Text>
        </View>
        <View className={styles.actionCard} onClick={() => goTo('/pages/outbound/index')}>
          <View className={classnames(styles.actionIcon, styles.outboundIcon)}>出</View>
          <Text className={styles.actionText}>出库</Text>
          <Text className={styles.actionDesc}>发料确认</Text>
        </View>
        <View className={styles.actionCard} onClick={() => goTo('/pages/return/index')}>
          <View className={classnames(styles.actionIcon, styles.returnIcon)}>退</View>
          <Text className={styles.actionText}>退库</Text>
          <Text className={styles.actionDesc}>拆下回库</Text>
        </View>
      </View>

      <Text className={styles.sectionTitle}>最近操作</Text>
      <View className={styles.recentSection}>
        {recentList.length > 0 ? (
          <View className={styles.recentList}>
            {recentList.map(item => (
              <View className={styles.recentItem} key={item.id}>
                <View
                  className={classnames(
                    styles.recentTypeTag,
                    item.type === 'inbound' && styles.typeInbound,
                    item.type === 'outbound' && styles.typeOutbound,
                    item.type === 'return' && styles.typeReturn
                  )}
                >
                  {TRANSACTION_TYPE_TEXT[item.type].charAt(0)}
                </View>
                <View className={styles.recentInfo}>
                  <Text className={styles.recentPart}>{item.partNumber}</Text>
                  <Text className={styles.recentTime}>{item.operateTime}</Text>
                </View>
                <Text className={styles.recentOperator}>{item.operator}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text className={styles.emptyTip}>暂无操作记录</Text>
        )}
      </View>
    </View>
  );
};

export default TransactPage;
