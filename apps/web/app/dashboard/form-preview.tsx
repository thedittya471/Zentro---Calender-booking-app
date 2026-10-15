"use client";

import {
  useEffect,
  useSyncExternalStore,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { FormField } from "../components/form-field";
import { FormFeedback } from "../components/form-feedback";

const subscribe = () => () => {};

export function FormPreview() {
  // Keep the local-only form inert until its submit handler is hydrated.
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [validated, setValidated] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (errors.name) nameInput.current?.focus();
    else if (errors.email) emailInput.current?.focus();
  }, [errors]);

  function validate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = nameInput.current;
    const email = emailInput.current;
    if (!name || !email) return;
    const nextErrors: typeof errors = {};
    if (!name.value.trim()) nextErrors.name = "Enter a name for this example.";
    if (!email.validity.valid)
      nextErrors.email = "Enter a valid email address for this example.";
    setErrors(nextErrors);
    setValidated(Object.keys(nextErrors).length === 0);
  }

  return (
    <details className="form-preview">
      <summary>
        Try the form components <span>Local preview</span>
      </summary>
      <form
        noValidate
        onSubmit={validate}
        onInput={() => {
          setValidated(false);
        }}
        onReset={() => {
          setErrors({});
          setValidated(false);
        }}
        aria-label="Form component preview"
        aria-describedby="form-preview-note"
      >
        <p id="form-preview-note" className="muted">
          Use made-up details to try validation and feedback. Nothing is sent,
          saved or booked.
        </p>
        <fieldset disabled={!ready}>
          <legend>Example contact details</legend>
          <FormField
            ref={nameInput}
            label="Name"
            required
            autoComplete="off"
            hint="For example, Alex."
            error={errors.name}
          />
          <FormField
            ref={emailInput}
            label="Email"
            type="email"
            required
            autoComplete="off"
            hint="For example, alex@example.com."
            error={errors.email}
          />
          <div className="form-actions">
            <button className="primary-link" type="submit">
              Check example
            </button>
            <button className="secondary-button" type="reset">
              Clear
            </button>
          </div>
        </fieldset>
        <FormFeedback tone="error">
          {Object.keys(errors).length > 0 &&
            "Check the highlighted fields, then try again."}
        </FormFeedback>
        <FormFeedback>
          {validated && "Example validated. Nothing was sent, saved or booked."}
        </FormFeedback>
        {!ready && (
          <p className="muted">This interactive preview requires JavaScript.</p>
        )}
      </form>
    </details>
  );
}
