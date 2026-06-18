import React from 'react';
import { View, Text } from '@tarojs/components';
import { PartStatus, STATUS_TEXT } from '@/types/part';
import styles from './index.module.scss';
import classnames from 'classnames';

interface StatusBadgeProps {
  status: PartStatus;
  size?: 'sm' | 'md';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  return (
    <View
      className={classnames(styles.badge, styles[status], size === 'sm' && styles.sm)}
    >
      <Text className={styles.dot} />
      <Text className={styles.text}>{STATUS_TEXT[status]}</Text>
    </View>
  );
};

export default StatusBadge;
