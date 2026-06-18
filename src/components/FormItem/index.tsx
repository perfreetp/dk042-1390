import React, { ReactNode } from 'react';
import { View, Text, Input } from '@tarojs/components';
import styles from './index.module.scss';
import classnames from 'classnames';

interface FormItemProps {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}

const FormItem: React.FC<FormItemProps> = ({ label, required, error, children }) => {
  return (
    <View className={styles.item}>
      <View className={styles.labelRow}>
        {required && <Text className={styles.required}>*</Text>}
        <Text className={styles.label}>{label}</Text>
      </View>
      <View className={classnames(styles.control, error && styles.controlError)}>
        {children}
      </View>
      {error && <Text className={styles.errorText}>{error}</Text>}
    </View>
  );
};

interface FormInputProps {
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  type?: 'text' | 'number';
  suffix?: string;
}

export const FormInput: React.FC<FormInputProps> = ({
  value,
  placeholder,
  onChange,
  type = 'text',
  suffix,
}) => {
  return (
    <View className={styles.inputWrap}>
      <Input
        className={styles.input}
        value={value}
        placeholder={placeholder}
        placeholderClass={styles.placeholder}
        onInput={e => onChange(e.detail.value)}
        type={type}
      />
      {suffix && <Text className={styles.suffix}>{suffix}</Text>}
    </View>
  );
};

export default FormItem;
