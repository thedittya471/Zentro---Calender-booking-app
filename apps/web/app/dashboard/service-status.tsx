"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FormFeedback } from "../components/form-feedback";
import { readinessQuery } from "../lib/queries";

export function ServiceStatus() {
  const [enabled, setEnabled] = useState(false);
  const { data, isError, isFetching, refetch } = useQuery({
    ...readinessQuery,
    enabled,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  return (
    <section className="service-status" aria-labelledby="service-status-title">
      <h2 id="service-status-title">Service connection</h2>
      <p className="muted">
        Check whether the API can reach its database. Scheduling is still a
        preview.
      </p>
      <button
        className="secondary-button"
        type="button"
        disabled={isFetching}
        onClick={() => {
          if (enabled) void refetch();
          else setEnabled(true);
        }}
      >
        {isFetching ? "Checking connection…" : "Check connection"}
      </button>
      <FormFeedback tone="error">
        {isError &&
          !isFetching &&
          "Connection unavailable. Try checking again."}
      </FormFeedback>
      <FormFeedback>
        {isFetching
          ? "Checking the service connection…"
          : data && !isError
            ? "Connection checked successfully. This is the last check, not a live monitor."
            : null}
      </FormFeedback>
    </section>
  );
}
