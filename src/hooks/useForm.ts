// src/hooks/useForm.ts
import { useState, useCallback } from 'react';

// バリデーション設定の型定義
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | undefined;
}

export type ValidationRules<T> = {
  [K in keyof T]?: ValidationRule;
}

export interface FormOptions<T> {
  initialValues: T;
  validationRules?: ValidationRules<T>;
}

export interface UseFormReturn<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  isSubmitting: boolean;
  hasErrors: boolean;
  
  // アクション
  setValue: (field: keyof T, value: T[keyof T]) => void;
  setValues: (newValues: Partial<T>) => void;
  setError: (field: keyof T, error: string) => void;
  clearError: (field: keyof T) => void;
  clearAllErrors: () => void;
  validateField: (field: keyof T) => boolean;
  validateAll: () => boolean;
  reset: () => void;
  setSubmitting: (submitting: boolean) => void;
  
  // 便利なヘルパー
  getFieldProps: (field: keyof T) => {
    name: string;
    value: string; // string型に統一
    onChange: (value: string) => void;
    error?: string;
  };
}

export const useForm = <T extends Record<string, any>>({
  initialValues,
  validationRules = {}
}: FormOptions<T>): UseFormReturn<T> => {
  const [values, setValuesState] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 単一フィールドの値を設定
  const setValue = useCallback((field: keyof T, value: T[keyof T]) => {
    setValuesState(prev => ({
      ...prev,
      [field]: value
    }));
    
    // 値が変更されたらエラーをクリア
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  // 複数フィールドの値を設定
  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState(prev => ({ ...prev, ...newValues }));
  }, []);

  // エラーを設定
  const setError = useCallback((field: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  }, []);

  // 単一フィールドのエラーをクリア
  const clearError = useCallback((field: keyof T) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  // 全エラーをクリア
  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  // 単一フィールドのバリデーション
  const validateField = useCallback((field: keyof T): boolean => {
    const rule = validationRules[field];
    if (!rule) return true;

    const value = String(values[field] || '');
    
    // required チェック
    if (rule.required && !value.trim()) {
      setError(field, `${String(field)}は必須です`);
      return false;
    }

    // minLength チェック
    if (rule.minLength && value.length < rule.minLength) {
      setError(field, `${String(field)}は${rule.minLength}文字以上で入力してください`);
      return false;
    }

    // maxLength チェック
    if (rule.maxLength && value.length > rule.maxLength) {
      setError(field, `${String(field)}は${rule.maxLength}文字以下で入力してください`);
      return false;
    }

    // pattern チェック
    if (rule.pattern && !rule.pattern.test(value)) {
      setError(field, `${String(field)}の形式が正しくありません`);
      return false;
    }

    // custom チェック
    if (rule.custom) {
      const customError = rule.custom(value);
      if (customError) {
        setError(field, customError);
        return false;
      }
    }

    clearError(field);
    return true;
  }, [values, validationRules, setError, clearError]);

  // 全フィールドのバリデーション
  const validateAll = useCallback((): boolean => {
    let isValid = true;
    
    Object.keys(validationRules).forEach(field => {
      if (!validateField(field as keyof T)) {
        isValid = false;
      }
    });
    
    return isValid;
  }, [validationRules, validateField]);

  // フォームをリセット
  const reset = useCallback(() => {
    setValuesState(initialValues);
    setErrors({});
    setIsSubmitting(false);
  }, [initialValues]);

  // 送信状態を設定
  const setSubmitting = useCallback((submitting: boolean) => {
    setIsSubmitting(submitting);
  }, []);

  // フィールドに必要なpropsを生成するヘルパー
  const getFieldProps = useCallback((field: keyof T) => ({
    name: String(field),
    value: String(values[field] || ''), // string型に統一
    onChange: (value: string) => setValue(field, value as T[keyof T]),
    error: errors[field]
  }), [values, errors, setValue]);

  const hasErrors = Object.keys(errors).length > 0;

  return {
    values,
    errors,
    isSubmitting,
    hasErrors,
    setValue,
    setValues,
    setError,
    clearError,
    clearAllErrors,
    validateField,
    validateAll,
    reset,
    setSubmitting,
    getFieldProps
  };
};