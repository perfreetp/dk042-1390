import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { LifePart } from '@/types/part';
import StatusBadge from '@/components/StatusBadge';
import styles from './index.module.scss';

interface PartCardProps {
  part: LifePart;
  onClick?: () => void;
}

const PartCard: React.FC<PartCardProps> = ({ part, onClick }) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      Taro.navigateTo({
        url: `/pages/detail/index?id=${part.id}`,
      });
    }
  };

  return (
    <View className={styles.card} onClick={handleClick}>
      <View className={styles.header}>
        <Text className={styles.partNumber}>{part.partNumber}</Text>
        <StatusBadge status={part.status} size="sm" />
      </View>
      <View className={styles.row}>
        <Text className={styles.label}>序号</Text>
        <Text className={styles.value}>{part.serialNumber}</Text>
      </View>
      <View className={styles.row}>
        <Text className={styles.label}>批次</Text>
        <Text className={styles.value}>{part.batchNumber}</Text>
      </View>
      <View className={styles.footer}>
        <View className={styles.lifeBox}>
          <Text className={styles.lifeValue}>{part.remainingLife}</Text>
          <Text className={styles.lifeUnit}>{part.lifeUnit}</Text>
          <Text className={styles.lifeLabel}>剩余寿命</Text>
        </View>
        <View className={styles.divider} />
        <View className={styles.expiryBox}>
          <Text className={styles.expiryValue}>{part.storageExpiryDate}</Text>
          <Text className={styles.expiryLabel}>封存到期</Text>
        </View>
        {part.location && (
          <>
            <View className={styles.divider} />
            <View className={styles.locationBox}>
              <Text className={styles.locationValue}>{part.location}</Text>
              <Text className={styles.locationLabel}>库位</Text>
            </View>
          </>
        )}
      </View>
      {part.statusReason && (
        <View className={styles.reason}>
          <Text className={styles.reasonText}>{part.statusReason}</Text>
        </View>
      )}
    </View>
  );
};

export default PartCard;
