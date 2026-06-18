import React, { useState, useMemo } from 'react';
import { View, Text, Button, Picker } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { usePart } from '@/store/PartContext';
import { LifePart } from '@/types/part';
import FormItem, { FormInput } from '@/components/FormItem';
import PartCard from '@/components/PartCard';
import StatusBadge from '@/components/StatusBadge';
import styles from './index.module.scss';
import classnames from 'classnames';

const CABINETS = ['A-1号发料柜', 'A-2号发料柜', 'B-1号发料柜', 'B-2号发料柜', 'C-1号发料柜'];

interface LifeCheck {
  pass: boolean;
  level: 'pass' | 'warn' | 'fail';
  title: string;
  desc: string;
  requiredLife?: number;
  remainingLife?: number;
  lifeUnit?: string;
}

const OutboundPage: React.FC = () => {
  const { parts, addTransaction } = usePart();
  const [searchSerial, setSearchSerial] = useState('');
  const [selectedPart, setSelectedPart] = useState<LifePart | null>(null);
  const [workOrder, setWorkOrder] = useState('');
  const [aircraftReg, setAircraftReg] = useState('');
  const [receiver, setReceiver] = useState('');
  const [cabinet, setCabinet] = useState('');
  const [certificateAttached, setCertificateAttached] = useState(false);
  const [plannedUsage, setPlannedUsage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const lifeCheck: LifeCheck | null = useMemo(() => {
    if (!selectedPart) return null;
    const planned = Number(plannedUsage) || 100;
    const threshold = selectedPart.lifeUnit === 'CY' ? 300 : 500;
    const remaining = selectedPart.remainingLife;
    const afterUse = remaining - planned;

    if (selectedPart.status === 'unavailable') {
      return {
        pass: false,
        level: 'fail',
        title: '✗ 该件不可发料',
        desc: selectedPart.statusReason || '当前状态不允许出库',
        remainingLife: remaining,
        lifeUnit: selectedPart.lifeUnit,
      };
    }
    if (afterUse < 0) {
      return {
        pass: false,
        level: 'fail',
        title: '✗ 剩余寿命不足',
        desc: `发料后寿命将出现负值，不满足本次使用需求`,
        requiredLife: planned,
        remainingLife: remaining,
        lifeUnit: selectedPart.lifeUnit,
      };
    }
    if (afterUse < threshold) {
      return {
        pass: true,
        level: 'warn',
        title: '⚠ 寿命余量偏低',
        desc: `发料后剩余寿命接近最低阈值，建议工程确认后发放`,
        requiredLife: planned,
        remainingLife: remaining,
        lifeUnit: selectedPart.lifeUnit,
      };
    }
    return {
      pass: true,
      level: 'pass',
      title: '✓ 寿命满足要求',
      desc: '剩余寿命满足计划使用窗口，可正常发料',
      requiredLife: planned,
      remainingLife: remaining,
      lifeUnit: selectedPart.lifeUnit,
    };
  }, [selectedPart, plannedUsage]);

  const handleScan = async () => {
    try {
      const res = await Taro.scanCode({});
      if (res.result) {
        setSearchSerial(res.result);
        searchPart(res.result);
      }
    } catch (e) {
      console.error('[Outbound] 扫码失败:', e);
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
    if (!selectedPart) newErrors.part = '请先选择要出库的寿命件';
    if (!workOrder.trim() && !aircraftReg.trim()) {
      newErrors.order = '请填写维修工单或飞机注册号';
    }
    if (!receiver.trim()) newErrors.receiver = '请填写领料人';
    if (!cabinet) newErrors.cabinet = '请选择发料柜位';
    if (!certificateAttached) newErrors.cert = '请确认证书随附情况';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      Taro.showToast({ title: '请完善必填信息', icon: 'none' });
      return;
    }
    if (lifeCheck?.level === 'fail') {
      Taro.showToast({ title: '该件不满足发料条件', icon: 'none' });
      return;
    }
    if (lifeCheck?.level === 'warn') {
      Taro.showModal({
        title: '寿命余量偏低',
        content: '该件发料后剩余寿命接近阈值，是否确认发放？',
        success: res => {
          if (res.confirm) doSubmit();
        },
      });
    } else {
      doSubmit();
    }
  };

  const doSubmit = () => {
    if (!selectedPart) return;
    addTransaction({
      partId: selectedPart.id,
      type: 'outbound',
      partNumber: selectedPart.partNumber,
      serialNumber: selectedPart.serialNumber,
      operator: '当前用户',
      workOrder: workOrder.trim() || undefined,
      aircraftReg: aircraftReg.trim() || undefined,
      receiver: receiver.trim(),
      cabinet,
      certificateAttached,
    });
    Taro.showToast({ title: '出库成功', icon: 'success' });
    setTimeout(() => Taro.navigateBack(), 1000);
  };

  return (
    <View className={styles.page}>
      <View className={styles.formCard}>
        <Text className={styles.sectionTitle}>选择寿命件</Text>
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
        <Text className={styles.sectionTitle}>发料信息</Text>
        <FormItem label="维修工单">
          <FormInput
            value={workOrder}
            placeholder="如 WO-2024-001"
            onChange={setWorkOrder}
          />
        </FormItem>
        <FormItem label="飞机注册号">
          <FormInput
            value={aircraftReg}
            placeholder="如 B-6123"
            onChange={setAircraftReg}
          />
        </FormItem>
        <FormItem label="计划使用量">
          <FormInput
            value={plannedUsage}
            placeholder="预计消耗寿命"
            type="number"
            suffix={selectedPart?.lifeUnit || '单位'}
            onChange={setPlannedUsage}
          />
        </FormItem>

        {lifeCheck && (
          <View
            className={classnames(
              styles.lifeCheckCard,
              lifeCheck.level === 'pass' && styles.checkPass,
              lifeCheck.level === 'warn' && styles.checkWarn,
              lifeCheck.level === 'fail' && styles.checkFail
            )}
          >
            <Text className={styles.checkTitle}>{lifeCheck.title}</Text>
            {lifeCheck.remainingLife !== undefined && (
              <>
                <View className={styles.checkRow}>
                  <Text className={styles.checkLabel}>当前剩余寿命</Text>
                  <Text className={styles.checkValue}>
                    {lifeCheck.remainingLife} {lifeCheck.lifeUnit}
                  </Text>
                </View>
                {lifeCheck.requiredLife !== undefined && (
                  <View className={styles.checkRow}>
                    <Text className={styles.checkLabel}>计划消耗量</Text>
                    <Text className={styles.checkValue}>
                      {lifeCheck.requiredLife} {lifeCheck.lifeUnit}
                    </Text>
                  </View>
                )}
                {lifeCheck.requiredLife !== undefined && (
                  <View className={styles.checkRow}>
                    <Text className={styles.checkLabel}>发料后剩余</Text>
                    <Text className={styles.checkValue}>
                      {lifeCheck.remainingLife - lifeCheck.requiredLife} {lifeCheck.lifeUnit}
                    </Text>
                  </View>
                )}
              </>
            )}
            <Text className={styles.checkDesc}>{lifeCheck.desc}</Text>
          </View>
        )}
      </View>

      <View className={styles.formCard}>
        <Text className={styles.sectionTitle}>发料确认</Text>
        <FormItem label="领料人" required error={errors.receiver}>
          <FormInput
            value={receiver}
            placeholder="请输入领料人姓名"
            onChange={setReceiver}
          />
        </FormItem>
        <FormItem label="发料柜位" required error={errors.cabinet}>
          <Picker
            mode="selector"
            range={CABINETS}
            value={CABINETS.indexOf(cabinet)}
            onChange={e => setCabinet(CABINETS[Number(e.detail.value)])}
          >
            <View className={styles.pickerWrap}>
              <Text
                className={classnames(styles.pickerText, !cabinet && styles.placeholder)}
              >
                {cabinet || '请选择柜位'}
              </Text>
            </View>
          </Picker>
        </FormItem>
        <View className={styles.checkboxRow} onClick={() => setCertificateAttached(!certificateAttached)}>
          <View className={classnames(styles.checkbox, certificateAttached && styles.checked)}>
            {certificateAttached && '✓'}
          </View>
          <Text className={styles.checkboxLabel}>随件证书已附交领料人</Text>
        </View>
        {errors.cert && <Text style={{ fontSize: 22, color: '#F53F3F' }}>{errors.cert}</Text>}
      </View>

      <View className={styles.footerBar}>
        <Button className={styles.cancelBtn} onClick={() => Taro.navigateBack()}>
          取消
        </Button>
        <Button
          className={classnames(styles.submitBtn, !lifeCheck?.pass && styles.disabled)}
          onClick={handleSubmit}
        >
          确认出库
        </Button>
      </View>
    </View>
  );
};

export default OutboundPage;
