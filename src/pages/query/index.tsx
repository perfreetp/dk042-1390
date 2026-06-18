import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, Input, ScrollView, Picker } from '@tarojs/components';
import Taro from '@tarojs/taro';
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

const STORAGE_KEY = 'query_filter_v1';

interface QueryFilter {
  keyword: string;
  statusFilter: FilterType;
  location: string;
  lifeUnit: string;
  expiryStart: string;
  expiryEnd: string;
}

const defaultFilter: QueryFilter = {
  keyword: '',
  statusFilter: 'all',
  location: '',
  lifeUnit: '',
  expiryStart: '',
  expiryEnd: '',
};

const QueryPage: React.FC = () => {
  const { parts } = usePart();
  const [filter, setFilter] = useState<QueryFilter>(defaultFilter);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    try {
      const saved = Taro.getStorageSync(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as QueryFilter;
        setFilter(parsed);
      }
    } catch (e) {
      console.error('[Query] 读取筛选条件失败:', e);
    }
  }, []);

  useEffect(() => {
    try {
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify(filter));
    } catch (e) {
      console.error('[Query] 保存筛选条件失败:', e);
    }
  }, [filter]);

  const locationOptions = useMemo(() => {
    const set = new Set<string>();
    parts.forEach(p => p.location && set.add(p.location));
    return ['全部', ...Array.from(set)];
  }, [parts]);

  const lifeUnitOptions = useMemo(() => {
    const set = new Set<string>();
    parts.forEach(p => p.lifeUnit && set.add(p.lifeUnit));
    return ['全部', ...Array.from(set)];
  }, [parts]);

  const filteredParts = useMemo(() => {
    let result = parts;
    if (filter.statusFilter === 'issued') {
      result = result.filter(p => p.isIssued);
    } else if (filter.statusFilter !== 'all') {
      result = result.filter(p => p.status === filter.statusFilter);
    }
    if (filter.keyword.trim()) {
      const kw = filter.keyword.trim().toLowerCase();
      result = result.filter(
        p =>
          p.partNumber.toLowerCase().includes(kw) ||
          p.serialNumber.toLowerCase().includes(kw) ||
          p.batchNumber.toLowerCase().includes(kw)
      );
    }
    if (filter.location) {
      result = result.filter(p => p.location === filter.location);
    }
    if (filter.lifeUnit) {
      result = result.filter(p => p.lifeUnit === filter.lifeUnit);
    }
    if (filter.expiryStart) {
      result = result.filter(p => p.storageExpiryDate >= filter.expiryStart);
    }
    if (filter.expiryEnd) {
      result = result.filter(p => p.storageExpiryDate <= filter.expiryEnd);
    }
    return result;
  }, [parts, filter]);

  const hasActiveFilters = useMemo(() => {
    return (
      filter.location ||
      filter.lifeUnit ||
      filter.expiryStart ||
      filter.expiryEnd
    );
  }, [filter]);

  const resetFilters = () => {
    setFilter(prev => ({
      ...prev,
      location: '',
      lifeUnit: '',
      expiryStart: '',
      expiryEnd: '',
    }));
  };

  return (
    <View className={styles.page}>
      <View className={styles.searchSection}>
        <View className={styles.searchBar}>
          <Text className={styles.searchIcon}>🔍</Text>
          <Input
            className={styles.searchInput}
            placeholderClass={styles.placeholder}
            placeholder="输入件号/序号/批次号搜索"
            value={filter.keyword}
            onInput={e => setFilter(prev => ({ ...prev, keyword: e.detail.value }))}
          />
        </View>
        <ScrollView scrollX className={styles.filterTabs} enhanced showScrollbar={false}>
          {FILTER_OPTIONS.map(opt => (
            <View
              key={opt.key}
              className={classnames(styles.filterTab, filter.statusFilter === opt.key && styles.active)}
              onClick={() => setFilter(prev => ({ ...prev, statusFilter: opt.key }))}
            >
              {opt.label}
            </View>
          ))}
        </ScrollView>

        <View
          className={styles.advancedToggle}
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <Text className={styles.advancedToggleText}>
          {hasActiveFilters ? '高级筛选 (已设置)' : '高级筛选'}
          </Text>
          <Text className={classnames(styles.advancedArrow, showAdvanced && styles.expanded)}>▼</Text>
        </View>

        {showAdvanced && (
          <View className={styles.advancedPanel}>
            <View className={styles.filterRow}>
              <Text className={styles.filterLabel}>库位</Text>
              <Picker
                mode="selector"
                range={locationOptions}
                value={Math.max(0, locationOptions.indexOf(filter.location || '全部'))}
                onChange={e => {
                  const val = locationOptions[Number(e.detail.value)];
                  setFilter(prev => ({
                    ...prev,
                    location: val === '全部' ? '' : val,
                  }));
                }}
              >
                <View className={styles.filterPicker}>
                  <Text className={classnames(styles.filterPickerText, !filter.location && styles.placeholder)}>
                    {filter.location || '全部库位'}
                  </Text>
                </View>
              </Picker>
            </View>

            <View className={styles.filterRow}>
              <Text className={styles.filterLabel}>寿命单位</Text>
              <Picker
                mode="selector"
                range={lifeUnitOptions}
                value={Math.max(0, lifeUnitOptions.indexOf(filter.lifeUnit || '全部'))}
                onChange={e => {
                  const val = lifeUnitOptions[Number(e.detail.value)];
                  setFilter(prev => ({
                    ...prev,
                    lifeUnit: val === '全部' ? '' : val,
                  }));
                }}
              >
                <View className={styles.filterPicker}>
                  <Text className={classnames(styles.filterPickerText, !filter.lifeUnit && styles.placeholder)}>
                    {filter.lifeUnit || '全部单位'}
                  </Text>
                </View>
              </Picker>
            </View>

            <View className={styles.filterRow}>
              <Text className={styles.filterLabel}>封存到期</Text>
              <View className={styles.dateRange}>
                <Input
                  className={styles.dateInput}
                  type="text"
                  placeholder="开始日期"
                  value={filter.expiryStart}
                  onInput={e => setFilter(prev => ({ ...prev, expiryStart: e.detail.value }))}
                  placeholderClass={styles.placeholder}
                />
                <Text className={styles.dateSep}>至</Text>
                <Input
                  className={styles.dateInput}
                  type="text"
                  placeholder="结束日期"
                  value={filter.expiryEnd}
                  onInput={e => setFilter(prev => ({ ...prev, expiryEnd: e.detail.value }))}
                  placeholderClass={styles.placeholder}
                />
              </View>
            </View>

            <View className={styles.filterActions}>
              <View className={styles.resetBtn} onClick={resetFilters}>
                <Text className={styles.resetBtnText}>重置</Text>
              </View>
            </View>
          </View>
        )}
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
