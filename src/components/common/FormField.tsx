// src/components/common/FormField.tsx
import React from 'react';
import './FormField.scss';

interface FormFieldProps {
  // 基本プロパティ
  type: 'text' | 'textarea' | 'select' | 'email' | 'password' | 'date';
  name: string;
  value: string;
  onChange: (value: string) => void;
  
  // オプションプロパティ
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
  rows?: number; // textareaの場合
  options?: Array<{ value: string; label: string }>; // selectの場合
  
  // エラー関連
  error?: string;
  
  // その他
  className?: string;
  id?: string;
  showCharCount?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({
  type,
  name,
  value,
  onChange,
  label,
  placeholder,
  required = false,
  disabled = false,
  maxLength,
  rows = 3,
  options = [],
  error,
  className = '',
  id,
  showCharCount = false
}) => {
  const fieldId = id || `field-${name}`;
  const hasError = !!error;
  const showCharacterCount = showCharCount && maxLength && (type === 'text' || type === 'textarea');

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    onChange(event.target.value);
  };

  const renderInput = () => {
    const commonProps = {
      id: fieldId,
      name,
      value,
      onChange: handleChange,
      placeholder,
      disabled,
      maxLength,
      className: `form-field-input ${hasError ? 'error' : ''} ${className}`,
      'aria-describedby': error ? `${fieldId}-error` : undefined,
      'aria-invalid': hasError
    };

    switch (type) {
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            rows={rows}
          />
        );
      
      case 'select':
        return (
          <select {...commonProps}>
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      default:
        return (
          <input
            {...commonProps}
            type={type}
            required={required}
          />
        );
    }
  };

  return (
    <div className={`form-field-container ${hasError ? 'has-error' : ''}`}>
      {label && (
        <label htmlFor={fieldId} className="form-field-label">
          {label}
          {required && <span className="required-indicator">*</span>}
        </label>
      )}
      
      <div className="form-field-input-wrapper">
        {renderInput()}
      </div>
      
      {showCharacterCount && (
        <div className="character-count">
          {value.length}/{maxLength}
        </div>
      )}
      
      {error && (
        <div 
          id={`${fieldId}-error`}
          className="form-field-error"
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}
    </div>
  );
};

export default FormField;