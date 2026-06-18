import React, { useState } from 'react';
import { View, Text, Button, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { usePart } from '@/store/PartContext';
import styles from './index.module.scss';
import classnames from 'classnames';

const ExceptionPage: React.FC = () => {
  const { exceptions, resolveException } = usePart();
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all');

  const filtered = exceptions.filter(e => filter === 'all' || e.status === filter);
  const pendingCount = exceptions.filter(e => e.status === 'pending').length;
  const resolvedCount = exceptions.filter(e => e.status === 'resolved').length;

  const handleResolve = (id: string) => {
    Taro.showModal({
      title: '处理异常',
      editable: true,
      placeholderText: '请输入处理人和处理说明',
      success: res => {
        if (res.confirm && res.content) {
          resolveException(id, '当前操作员', res.content);
          Taro.showToast({ title: '已处理', icon: 'success' });
        }
      },
    });
  };

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.title}>异常记录</Text>
        <Text className={styles.subtitle}>跟踪寿命件异常状态，及时处理</Text>
      </View>

      <View className={styles.summaryRow}>
        <View className={styles.summaryCard}>
          <Text className={classnames(styles.summaryValue, styles.pending)}>{pendingCount}</Text>
          <Text className={styles.summaryLabel}>待处理</Text>
        </View>
        <View className={styles.summaryCard}>
          <Text className={classnames(styles.summaryValue, styles.resolved)}>{resolvedCount}</Text>
          <Text className={styles.summaryLabel}>已处理</Text>
        </View>
      </View>

      <View style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
        {[
          { k: 'all', l: '全部' },
          { k: 'pending', l: '待处理' },
          { k: 'resolved', l: '已处理' },
        ].map(opt => (
          <View
            key={opt.k}
            onClick={() => setFilter(opt.k as any)}
            style={{
              padding: '8px 24px',
              borderRadius: 48,
              fontSize: 24,
              background: filter === opt.k ? '#1E64C8' : '#F7F8FA',
              color: filter === opt.k ? '#fff' : '#4E5969',
            }}
          >
            {opt.l}
          </View>
        ))}
      </View>

      {filtered.length > 0 ? (
        filtered.map(item => (
          <View className={styles.exceptionCard} key={item.id}>
            <View className={styles.cardHeader}>
              <Text className={styles.typeTag}>{item.type}</Text>
              <Text className={classnames(styles.statusTag, item.status)}>
                {item.status === 'pending' ? '待处理' : '已处理'}
              </Text>
            </View>
            <View className={styles.partInfo}>
              <Text className={styles.partNumber}>{item.partNumber}</Text>
              <Text className={styles.serialNumber}>{item.serialNumber}</Text>
            </View>
            <Text className={styles.description}>{item.description}</Text>
            <View className={styles.metaRow}>
              <Text>记录时间：{item.createTime}</Text>
            </View>
            {item.status === 'resolved' && (
              <View className={styles.resolveSection}>
                <Text className={styles.resolveRow}>处理人：{item.handler}</Text>
                <Text className={styles.resolveRow}>处理时间：{item.resolveTime}</Text>
                <Text className={styles.resolveNote}>{item.resolveNote}</Text>
              </View>
            )}
            {item.status === 'pending' && (
              <Button className={styles.actionBtn} onClick={() => handleResolve(item.id)}>
                标记已处理
              </Button>
            )}
          </View>
        ))
      ) : (
        <View className={styles.emptyState}>
          <Text className={styles.emptyIcon}>✅</Text>
          <Text className={styles.emptyText}>暂无异常记录</Text>
        </View>
      )}
    </ScrollView>
  );
};

export default ExceptionPage;
