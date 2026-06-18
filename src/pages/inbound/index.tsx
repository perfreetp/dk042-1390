import React, { useState, useMemo } from 'react';
import { View, Text, Button, Picker } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { usePart } from '@/store/PartContext';
import FormItem, { FormInput } from '@/components/FormItem';
import StatusBadge from '@/components/StatusBadge';
import styles from './index.module.scss';
import classnames from 'classnames';

const LIFE_UNITS = ['FH', 'CY', 'HS', 'DAY'];

const InboundPage: React.FC = () => {
  const { addPart, evaluateStatus } = usePart();

  const [partNumber, setPartNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [remainingLife, setRemainingLife] = useState('');
  const [lifeUnit, setLifeUnit] = useState('FH');
  const [certificateNumber, setCertificateNumber] = useState('');
  const [storageExpiryDate, setStorageExpiryDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const statusResult = useMemo(() => {
    if (!remainingLife || !storageExpiryDate) return null;
    return evaluateStatus({
      remainingLife: Number(remainingLife),
      lifeUnit,
      storageExpiryDate,
    });
  }, [remainingLife, lifeUnit, storageExpiryDate, evaluateStatus]);

  const handleScan = async () => {
    try {
      const res = await Taro.scanCode({});
      if (res.result) {
        const parts = res.result.split('|');
        if (parts.length >= 1) setPartNumber(parts[0]);
        if (parts.length >= 2) setSerialNumber(parts[1]);
        if (parts.length >= 3) setBatchNumber(parts[2]);
      }
    } catch (e) {
      console.error('[Inbound] 扫码失败:', e);
      Taro.showToast({ title: '扫码失败，请手动输入', icon: 'none' });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!partNumber.trim()) newErrors.partNumber = '请输入件号';
    if (!serialNumber.trim()) newErrors.serialNumber = '请输入序号';
    if (!batchNumber.trim()) newErrors.batchNumber = '请输入批次号';
    if (!remainingLife) newErrors.remainingLife = '请输入剩余寿命';
    else if (Number(remainingLife) < 0) newErrors.remainingLife = '剩余寿命不能为负';
    if (!certificateNumber.trim()) newErrors.certificateNumber = '请输入随件证书号';
    if (!storageExpiryDate) newErrors.storageExpiryDate = '请选择封存到期日';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      Taro.showToast({ title: '请完善必填信息', icon: 'none' });
      return;
    }
    if (statusResult?.status === 'unavailable') {
      Taro.showModal({
        title: '该件状态为不可发料',
        content: '是否仍要入库？该件将被标记为不可发料状态。',
        success: res => {
          if (res.confirm) doSubmit();
        },
      });
    } else {
      doSubmit();
    }
  };

  const doSubmit = () => {
    addPart({
      partNumber: partNumber.trim(),
      serialNumber: serialNumber.trim(),
      batchNumber: batchNumber.trim(),
      remainingLife: Number(remainingLife),
      lifeUnit,
      certificateNumber: certificateNumber.trim(),
      storageExpiryDate,
      status: statusResult?.status ?? 'available',
      statusReason: statusResult?.reason,
    });
    Taro.showToast({ title: '入库成功', icon: 'success' });
    setTimeout(() => Taro.navigateBack(), 1000);
  };

  return (
    <View className={styles.page}>
      <View className={styles.formCard}>
        <Button className={styles.scanBtn} onClick={handleScan}>
          📷 扫描包装标签自动录入
        </Button>

        <Text className={styles.sectionTitle}>基础标识</Text>
        <FormItem label="件号" required error={errors.partNumber}>
          <FormInput
            value={partNumber}
            placeholder="请输入或扫描件号"
            onChange={setPartNumber}
          />
        </FormItem>
        <FormItem label="序号" required error={errors.serialNumber}>
          <FormInput
            value={serialNumber}
            placeholder="请输入或扫描序号"
            onChange={setSerialNumber}
          />
        </FormItem>
        <FormItem label="批次号" required error={errors.batchNumber}>
          <FormInput
            value={batchNumber}
            placeholder="请输入或扫描批次号"
            onChange={setBatchNumber}
          />
        </FormItem>
      </View>

      <View className={styles.formCard}>
        <Text className={styles.sectionTitle}>寿命信息</Text>
        <FormItem label="剩余寿命" required error={errors.remainingLife}>
          <FormInput
            value={remainingLife}
            placeholder="请输入数值"
            type="number"
            onChange={setRemainingLife}
          />
        </FormItem>
        <FormItem label="计量单位" required>
          <View className={styles.unitOptions}>
            {LIFE_UNITS.map(u => (
              <View
                key={u}
                className={classnames(styles.unitOption, lifeUnit === u && styles.active)}
                onClick={() => setLifeUnit(u)}
              >
                {u}
              </View>
            ))}
          </View>
        </FormItem>
        <FormItem label="随件证书号" required error={errors.certificateNumber}>
          <FormInput
            value={certificateNumber}
            placeholder="请输入证书编号"
            onChange={setCertificateNumber}
          />
        </FormItem>
        <FormItem label="封存到期日" required error={errors.storageExpiryDate}>
          <Picker
            mode="date"
            value={storageExpiryDate}
            start="2020-01-01"
            end="2035-12-31"
            onChange={e => setStorageExpiryDate(e.detail.value)}
          >
            <View className={styles.pickerWrap}>
              <Text
                className={classnames(
                  styles.pickerText,
                  !storageExpiryDate && styles.placeholder
                )}
              >
                {storageExpiryDate || '请选择日期'}
              </Text>
            </View>
          </Picker>
        </FormItem>

        {statusResult && (
          <View
            className={classnames(
              styles.statusPreview,
              statusResult.status === 'available' && styles.statusAvailable,
              statusResult.status === 'pending' && styles.statusPending,
              statusResult.status === 'unavailable' && styles.statusUnavailable
            )}
          >
            <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text className={styles.statusLabel}>状态判定结果</Text>
              <StatusBadge status={statusResult.status} size="sm" />
            </View>
            {statusResult.reason && (
              <Text className={styles.statusReason}>{statusResult.reason}</Text>
            )}
            {statusResult.status === 'available' && (
              <Text className={styles.statusReason}>该寿命件满足上架条件，可正常入库</Text>
            )}
          </View>
        )}
      </View>

      <View className={styles.footerBar}>
        <Button className={styles.cancelBtn} onClick={() => Taro.navigateBack()}>
          取消
        </Button>
        <Button className={styles.submitBtn} onClick={handleSubmit}>
          确认入库
        </Button>
      </View>
    </View>
  );
};

export default InboundPage;
