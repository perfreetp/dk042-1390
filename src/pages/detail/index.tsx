import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Button, Textarea, Input } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { usePart } from '@/store/PartContext';
import { JudgmentResult, JUDGMENT_RESULT_TEXT } from '@/types/part';
import StatusBadge from '@/components/StatusBadge';
import styles from './index.module.scss';
import classnames from 'classnames';

const DetailPage: React.FC = () => {
  const router = useRouter();
  const { getPartById, getTimeline, judgePart } = usePart();
  const partId = router.params.id;

  const part = useMemo(() => (partId ? getPartById(partId) : undefined), [partId, getPartById]);
  const timeline = useMemo(
    () => (partId ? getTimeline(partId) : []),
    [partId, getTimeline]
  );

  const [showJudgeModal, setShowJudgeModal] = useState(false);
  const [judgeResult, setJudgeResult] = useState<JudgmentResult>('reissue');
  const [judgeRemark, setJudgeRemark] = useState('');
  const [judgeOperator, setJudgeOperator] = useState('');

  if (!part) {
    return (
      <View className={styles.page}>
        <View style={{ padding: 100, textAlign: 'center' }}>
          <Text style={{ color: '#86909C' }}>未找到该寿命件信息</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.headerCard}>
        <Text className={styles.headerPartNumber}>{part.partNumber}</Text>
        <Text className={styles.headerSerial}>序号：{part.serialNumber}</Text>
        <View className={styles.headerTagRow}>
          {part.isIssued && (
            <View className={styles.headerIssuedTag}>
              <Text className={styles.headerIssuedTagText}>已发出</Text>
            </View>
          )}
          <StatusBadge status={part.status} />
        </View>
      </View>

      <View className={styles.contentWrap}>
        <View className={styles.infoCard}>
          <View className={styles.lifeSummary}>
            <View className={styles.summaryItem}>
              <Text className={styles.summaryValue}>{part.remainingLife}</Text>
              <Text className={styles.summaryUnit}>{part.lifeUnit}</Text>
              <Text className={styles.summaryLabel}>剩余寿命</Text>
            </View>
            <View className={styles.summaryDivider} />
            <View className={styles.summaryItem}>
              <Text
                className={styles.summaryValue}
                style={{ fontSize: 28, color: '#1D2129', marginTop: 6 }}
              >
                {part.storageExpiryDate}
              </Text>
              <Text className={styles.summaryLabel} style={{ marginTop: 16 }}>封存到期日</Text>
            </View>
            <View className={styles.summaryDivider} />
            <View className={styles.summaryItem}>
              <Text
                className={styles.summaryValue}
                style={{ fontSize: 28, color: '#1D2129', marginTop: 6 }}
              >
                {part.location || '-'}
              </Text>
              <Text className={styles.summaryLabel} style={{ marginTop: 16 }}>当前库位</Text>
            </View>
          </View>
        </View>

        <View className={styles.infoCard}>
          <Text className={styles.cardTitle}>
            <View className={styles.cardTitleIcon} />
            基础信息
          </Text>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>件号</Text>
            <Text className={styles.infoValue}>{part.partNumber}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>序号</Text>
            <Text className={styles.infoValue}>{part.serialNumber}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>批次号</Text>
            <Text className={styles.infoValue}>{part.batchNumber}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>随件证书号</Text>
            <Text className={styles.infoValue}>{part.certificateNumber}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>入库时间</Text>
            <Text className={styles.infoValue}>{part.createTime}</Text>
          </View>
          {part.isIssued && part.issuedInfo && (
            <>
              <View className={styles.infoRow}>
                <Text className={styles.infoLabel}>领料人</Text>
                <Text className={styles.infoValue}>{part.issuedInfo.receiver || '-'}</Text>
              </View>
              <View className={styles.infoRow}>
                <Text className={styles.infoLabel}>工单/飞机</Text>
                <Text className={styles.infoValue}>
                  {part.issuedInfo.workOrder || part.issuedInfo.aircraftReg || '-'}
                </Text>
              </View>
              <View className={styles.infoRow}>
                <Text className={styles.infoLabel}>本次消耗</Text>
                <Text className={styles.infoValue}>
                  {part.issuedInfo.usedLife} {part.lifeUnit}
                </Text>
              </View>
              <View className={styles.infoRow}>
                <Text className={styles.infoLabel}>发出时间</Text>
                <Text className={styles.infoValue}>{part.issuedInfo.issueTime}</Text>
              </View>
            </>
          )}
          {part.statusReason && (
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>状态说明</Text>
              <Text
                className={styles.infoValue}
                style={{ color: part.isIssued ? '#1E64C8' : '#FF7D00' }}
              >
                {part.statusReason}
              </Text>
            </View>
          )}
        </View>

        {part.status === 'pending' && !part.isIssued && (
          <View className={styles.actionCard}>
            <Button
              className={styles.judgeBtn}
              onClick={() => setShowJudgeModal(true)}
            >
              🔧 工程判定
            </Button>
          </View>
        )}

        <View className={styles.infoCard}>
          <Text className={styles.cardTitle}>
            <View className={styles.cardTitleIcon} />
            时间线
          </Text>
          {timeline.length > 0 ? (
            <View className={styles.timelineWrap}>
              {timeline.map((event, index) => (
                <View key={event.id} className={styles.timelineItem}>
                  <View className={styles.timelineDotWrap}>
                    <View
                      className={styles.timelineDot}
                      style={{ background: event.color }}
                    />
                    {index < timeline.length - 1 && (
                      <View className={styles.timelineLine} />
                    )}
                  </View>
                  <View className={styles.timelineContent}>
                    <View className={styles.timelineHeader}>
                      <Text
                        className={classnames(
                          styles.timelineType,
                          event.type === 'inbound' && styles.typeInbound,
                          event.type === 'outbound' && styles.typeOutbound,
                          event.type === 'return' && styles.typeReturn,
                          (event.type === 'exception_create' || event.type === 'exception_resolve') && styles.typeException,
                          event.type === 'judgment' && styles.typeJudgment
                        )}
                      >
                        {event.title}
                      </Text>
                      <Text className={styles.timelineTime}>{event.time}</Text>
                    </View>
                    <Text className={styles.timelineDesc}>{event.desc}</Text>
                    {event.operator && (
                      <Text className={styles.timelineOperator}>操作人：{event.operator}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text className={styles.emptyHistory}>暂无记录</Text>
          )}
        </View>
      </View>

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
                onClick={() => {
                  if (!judgeOperator.trim()) {
                    Taro.showToast({ title: '请输入判定人', icon: 'none' });
                    return;
                  }
                  if (!partId) return;
                  judgePart(partId, judgeResult, judgeRemark, judgeOperator.trim());
                  Taro.showToast({ title: '判定成功', icon: 'success' });
                  setShowJudgeModal(false);
                }}
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

export default DetailPage;
