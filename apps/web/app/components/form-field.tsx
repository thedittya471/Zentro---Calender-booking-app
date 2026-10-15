"use client";

import { useId, type ComponentProps } from "react";

type FormFieldProps = ComponentProps<"input"> & {
  label: string;
  hint?: string;
  error?: string | undefined;
};

export function FormField({
  label,
  hint,
  error,
  id,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  ...inputProps
}: FormFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const description = [
    describedBy,
    hint && `${fieldId}-hint`,
    error && `${fieldId}-error`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="form-field">
      <label htmlFor={fieldId}>
        {label}
        {inputProps.required && <span> (required)</span>}
      </label>
      {hint && (
        <p className="field-hint" id={`${fieldId}-hint`}>
          {hint}
        </p>
      )}
      <input
        {...inputProps}
        id={fieldId}
        aria-describedby={description || undefined}
        aria-invalid={error ? true : invalid}
      />
      {error && (
        <p className="field-error" id={`${fieldId}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
