import React, { useState } from 'react';
import { View, Text, Button, ScrollView, Input, Textarea } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { usePart } from '@/store/PartContext';
import { JudgmentResult, JUDGMENT_RESULT_TEXT } from '@/types/part';
import styles from './index.module.scss';
import classnames from 'classnames';

const ExceptionPage: React.FC = () => {
  const { exceptions, resolveException, judgePart } = usePart();
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const [showJudgeModal, setShowJudgeModal] = useState(false);
  const [currentExceptionId, setCurrentExceptionId] = useState('');
  const [currentPartId, setCurrentPartId] = useState('');
  const [judgeResult, setJudgeResult] = useState<JudgmentResult>('reissue');
  const [judgeRemark, setJudgeRemark] = useState('');
  const [judgeOperator, setJudgeOperator] = useState('');

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

  const openJudgeModal = (exceptionId: string, partId: string) => {
    setCurrentExceptionId(exceptionId);
    setCurrentPartId(partId);
    setJudgeResult('reissue');
    setJudgeRemark('');
    setJudgeOperator('');
    setShowJudgeModal(true);
  };

  const handleJudgeConfirm = () => {
    if (!judgeOperator.trim()) {
      Taro.showToast({ title: '请输入判定人', icon: 'none' });
      return;
    }
    judgePart(
      currentPartId,
      judgeResult,
      judgeRemark,
      judgeOperator.trim(),
      currentExceptionId
    );
    Taro.showToast({ title: '判定成功', icon: 'success' });
    setShowJudgeModal(false);
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
                {item.judgmentResult && (
                  <View className={styles.judgmentResultRow}>
                    <Text className={styles.judgmentResultLabel}>工程判定：</Text>
                    <Text className={classnames(
                      styles.judgmentResultValue,
                      item.judgmentResult === 'reissue' && styles.judgeReissue,
                      item.judgmentResult === 'quarantine' && styles.judgeQuarantine,
                      item.judgmentResult === 'scrap' && styles.judgeScrap
                    )}>
                      {JUDGMENT_RESULT_TEXT[item.judgmentResult]}
                    </Text>
                  </View>
                )}
                <Text className={styles.resolveNote}>{item.resolveNote}</Text>
              </View>
            )}
            {item.status === 'pending' && (
              <View className={styles.actionRow}>
                <Button
                  className={styles.judgeBtn}
                  onClick={() => openJudgeModal(item.id, item.partId)}
                >
                  🔧 工程判定
                </Button>
                <Button className={styles.actionBtn} onClick={() => handleResolve(item.id)}>
                  标记已处理
                </Button>
              </View>
            )}
          </View>
        ))
      ) : (
        <View className={styles.emptyState}>
          <Text className={styles.emptyIcon}>✅</Text>
          <Text className={styles.emptyText}>暂无异常记录</Text>
        </View>
      )}

      {showJudgeModal && (
        <View className={styles.modalMask} onClick={() => setShowJudgeModal(false)}>
          <View className={styles.modalWrap} onClick={e => e.stopPropagation()}>
            <Text className={styles.modalTitle}>工程判定</Text>
            <View className={styles.judgeOptions}>
              {(['reissue', 'quarantine', 'scrap'] as JudgmentResult[]).map(r => (
                <View
                  key={r}
                  className={classnames(
                    styles.judgeOption,
                    judgeResult === r && styles.judgeOptionActive
                  )}
                  onClick={() => setJudgeResult(r)}
                >
                  <Text
                    className={classnames(
                      styles.judgeOptionText,
                      judgeResult === r && r === 'reissue' && styles.judgeReissue,
                      judgeResult === r && r === 'quarantine' && styles.judgeQuarantine,
                      judgeResult === r && r === 'scrap' && styles.judgeScrap
                    )}
                  >
                    {JUDGMENT_RESULT_TEXT[r]}
                  </Text>
                </View>
              ))}
            </View>
            <View className={styles.modalFormItem}>
              <Text className={styles.modalLabel}>判定人</Text>
              <Input
                className={styles.modalInput}
                placeholder="请输入判定人姓名"
                value={judgeOperator}
                onInput={e => setJudgeOperator(e.detail.value)}
              />
            </View>
            <View className={styles.modalFormItem}>
              <Text className={styles.modalLabel}>判定说明</Text>
              <Textarea
                className={styles.modalTextarea}
                value={judgeRemark}
                placeholder="请输入判定说明"
                onInput={e => setJudgeRemark(e.detail.value)}
                maxlength={200}
              />
            </View>
            <View className={styles.modalFooter}>
              <Button
                className={styles.modalCancelBtn}
                onClick={() => setShowJudgeModal(false)}
              >
                取消
              </Button>
              <Button
                className={styles.modalConfirmBtn}
                onClick={handleJudgeConfirm}
              >
                确认判定
              </Button>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default ExceptionPage;
