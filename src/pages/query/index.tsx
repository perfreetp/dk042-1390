import React, { useState, useMemo } from 'react';
import { View, Text, Input, ScrollView } from '@tarojs/components';
import { usePart } from '@/store/PartContext';
import { PartStatus } from '@/types/part';
import PartCard from '@/components/PartCard';
import styles from './index.module.scss';
import classnames from 'classnames';

type FilterType = 'all' | PartStatus | 'issued';

const FILTER_OPTIONS: { key: FilterType; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'available', label: '可用' },
  { key: 'pending', label: '待工程判定' },
  { key: 'unavailable', label: '不可发料' },
  { key: 'issued', label: '已发出' },
];

const QueryPage: React.FC = () => {
  const { parts } = usePart();
  const [keyword, setKeyword] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredParts = useMemo(() => {
    let result = parts;
    if (filter === 'issued') {
      result = result.filter(p => p.isIssued);
    } else if (filter !== 'all') {
      result = result.filter(p => p.status === filter);
    }
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      result = result.filter(
        p =>
          p.partNumber.toLowerCase().includes(kw) ||
          p.serialNumber.toLowerCase().includes(kw) ||
          p.batchNumber.toLowerCase().includes(kw)
      );
    }
    return result;
  }, [parts, keyword, filter]);

  return (
    <View className={styles.page}>
      <View className={styles.searchSection}>
        <View className={styles.searchBar}>
          <Text className={styles.searchIcon}>🔍</Text>
          <Input
            className={styles.searchInput}
            placeholderClass={styles.placeholder}
            placeholder="输入件号/序号/批次号搜索"
            value={keyword}
            onInput={e => setKeyword(e.detail.value)}
          />
        </View>
        <ScrollView scrollX className={styles.filterTabs} enhanced showScrollbar={false}>
          {FILTER_OPTIONS.map(opt => (
            <View
              key={opt.key}
              className={classnames(styles.filterTab, filter === opt.key && styles.active)}
              onClick={() => setFilter(opt.key)}
            >
              {opt.label}
            </View>
          ))}
        </ScrollView>
      </View>

      <View className={styles.listSection}>
        <View className={styles.listHeader}>
          <Text className={styles.listTitle}>寿命件列表</Text>
          <Text className={styles.listCount}>共 {filteredParts.length} 件</Text>
        </View>
        {filteredParts.length > 0 ? (
          filteredParts.map(part => <PartCard key={part.id} part={part} />)
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>📦</Text>
            <Text className={styles.emptyText}>未找到符合条件的寿命件</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default QueryPage;
