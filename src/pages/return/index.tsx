import React, { useState } from 'react';
import { View, Text, Button, Textarea } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { usePart } from '@/store/PartContext';
import { LifePart, ReturnReason, RETURN_REASON_TEXT } from '@/types/part';
import FormItem, { FormInput } from '@/components/FormItem';
import PartCard from '@/components/PartCard';
import styles from './index.module.scss';
import classnames from 'classnames';

const REASON_OPTIONS: { key: ReturnReason; icon: string; desc: string }[] = [
  { key: 'life_expired', icon: '⏰', desc: '正常寿命到限拆下' },
  { key: 'fault', icon: '⚠️', desc: '故障或异常拆下' },
  { key: 'wrong_issue', icon: '↩️', desc: '错发退回库房' },
  { key: 'for_repair', icon: '🔧', desc: '待送修或送检' },
];

const ReturnPage: React.FC = () => {
  const { parts, addTransaction } = usePart();
  const [searchSerial, setSearchSerial] = useState('');
  const [selectedPart, setSelectedPart] = useState<LifePart | null>(null);
  const [returnReason, setReturnReason] = useState<ReturnReason | null>(null);
  const [remark, setRemark] = useState('');
  const [operator, setOperator] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleScan = async () => {
    try {
      const res = await Taro.scanCode({});
      if (res.result) {
        setSearchSerial(res.result);
        searchPart(res.result);
      }
    } catch (e) {
      console.error('[Return] 扫码失败:', e);
      Taro.showToast({ title: '扫码失败', icon: 'none' });
    }
  };

  const searchPart = (serial: string) => {
    const part = parts.find(
      p => p.serialNumber === serial || p.serialNumber.toLowerCase().includes(serial.toLowerCase())
    );
    if (part) {
      setSelectedPart(part);
    } else {
      Taro.showToast({ title: '未找到该寿命件', icon: 'none' });
      setSelectedPart(null);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedPart) newErrors.part = '请先选择退库的寿命件';
    if (!returnReason) newErrors.reason = '请选择拆下原因';
    if (!operator.trim()) newErrors.operator = '请填写经办人';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      Taro.showToast({ title: '请完善必填信息', icon: 'none' });
      return;
    }
    if (!selectedPart || !returnReason) return;
    addTransaction({
      partId: selectedPart.id,
      type: 'return',
      partNumber: selectedPart.partNumber,
      serialNumber: selectedPart.serialNumber,
      operator: operator.trim(),
      returnReason,
      remark: remark.trim() || undefined,
    });
    Taro.showToast({ title: '退库成功', icon: 'success' });
    setTimeout(() => Taro.navigateBack(), 1000);
  };

  return (
    <View className={styles.page}>
      <View className={styles.formCard}>
        <Text className={styles.sectionTitle}>选择退库件</Text>
        <Button className={styles.searchBtn} onClick={handleScan}>
          📷 扫描序号查找
        </Button>
        <View style={{ height: 16 }} />
        <FormItem label="序号搜索" error={errors.part}>
          <FormInput
            value={searchSerial}
            placeholder="输入序号后查找"
            onChange={v => {
              setSearchSerial(v);
              if (v) searchPart(v);
            }}
          />
        </FormItem>
        {selectedPart && <View style={{ marginTop: 16 }}><PartCard part={selectedPart} /></View>}
      </View>

      <View className={styles.formCard}>
        <Text className={styles.sectionTitle}>拆下原因</Text>
        <View className={styles.reasonGrid}>
          {REASON_OPTIONS.map(opt => (
            <View
              key={opt.key}
              className={classnames(
                styles.reasonCard,
                returnReason === opt.key && styles.active
              )}
              onClick={() => setReturnReason(opt.key)}
            >
              <Text className={styles.reasonIcon}>{opt.icon}</Text>
              <Text className={styles.reasonText}>{RETURN_REASON_TEXT[opt.key]}</Text>
              <Text className={styles.reasonDesc}>{opt.desc}</Text>
            </View>
          ))}
        </View>
        {errors.reason && (
          <Text style={{ fontSize: 22, color: '#F53F3F', marginTop: 8 }}>{errors.reason}</Text>
        )}
      </View>

      <View className={styles.formCard}>
        <Text className={styles.sectionTitle}>退库信息</Text>
        <FormItem label="经办人" required error={errors.operator}>
          <FormInput
            value={operator}
            placeholder="请输入经办人姓名"
            onChange={setOperator}
          />
        </FormItem>
        <FormItem label="备注">
          <View className={styles.textareaWrap}>
            <Textarea
              className={styles.textarea}
              value={remark}
              placeholder="请输入退库备注信息（选填）"
              placeholderClass="textarea-placeholder"
              onInput={e => setRemark(e.detail.value)}
              maxlength={200}
            />
          </View>
        </FormItem>
      </View>

      <View className={styles.footerBar}>
        <Button className={styles.cancelBtn} onClick={() => Taro.navigateBack()}>
          取消
        </Button>
        <Button
          className={classnames(styles.submitBtn, (!selectedPart || !returnReason) && styles.disabled)}
          onClick={handleSubmit}
        >
          确认退库
        </Button>
      </View>
    </View>
  );
};

export default ReturnPage;
