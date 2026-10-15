"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { m, useReducedMotion } from "motion/react";
import { useState } from "react";

const questions = [
  {
    question: "Can I schedule with Zentro today?",
    answer:
      "Not yet. Zentro is in development. You can explore the workspace preview, but booking, account and calendar actions aren’t available yet.",
  },
  {
    question: "Who is Zentro being built for?",
    answer:
      "Independent professionals and people who meet one-to-one. The first release focuses on one host and one guest, rather than team or group scheduling.",
  },
  {
    question: "Will my guests need an account?",
    answer:
      "The planned booking flow lets guests choose a time without creating an account. Hosts will sign in to manage their own availability and meetings.",
  },
  {
    question: "Which calendars are planned?",
    answer:
      "Google Calendar is planned for the first release, including busy-time checks and meeting updates. Other calendar providers are outside the initial release.",
  },
];

export function Questions() {
  const [open, setOpen] = useState("question-0");
  const reducedMotion = useReducedMotion();
  return (
    <Accordion.Root
      className="questions"
      type="single"
      collapsible
      value={open}
      onValueChange={setOpen}
    >
      {questions.map(({ question, answer }, index) => (
        <Accordion.Item
          className="question-item"
          key={question}
          value={`question-${index}`}
        >
          <Accordion.Header className="question-heading">
            <Accordion.Trigger className="question-trigger">
              {question}
              <m.span
                aria-hidden="true"
                animate={{ rotate: open === `question-${index}` ? 45 : 0 }}
                transition={{ duration: reducedMotion ? 0 : 0.2 }}
              >
                +
              </m.span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="question-content">
            <p>{answer}</p>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
