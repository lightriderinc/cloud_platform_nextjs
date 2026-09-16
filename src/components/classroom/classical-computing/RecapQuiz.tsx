"use client";

import { useState } from "react";
import ChalkboardPanel from "../course/ChalkboardPanel";
import ChalkButton from "../course/ChalkButton";

type Question = {
  prompt: string;
  options: string[];
  answer: number;
};

const QUESTIONS: Question[] = [
  {
    prompt: "How many values can a single bit hold?",
    options: ["2", "4", "8", "10"],
    answer: 0,
  },
  {
    prompt: "What is 1101 in decimal?",
    options: ["11", "13", "14", "10"],
    answer: 1,
  },
  {
    prompt: "Which gate outputs 1 only when both of its inputs are 1?",
    options: ["OR", "NOT", "AND", "XOR"],
    answer: 2,
  },
  {
    prompt: "In a half adder, which operation produces the carry bit?",
    options: ["XOR", "AND", "OR", "NOT"],
    answer: 1,
  },
];

export default function RecapQuiz() {
  const [selected, setSelected] = useState<(number | null)[]>(
    Array(QUESTIONS.length).fill(null),
  );

  function choose(questionIndex: number, optionIndex: number) {
    setSelected((prev) =>
      prev.map((value, i) => (i === questionIndex ? optionIndex : value)),
    );
  }

  const answered = selected.filter((value) => value !== null).length;
  const correct = selected.filter(
    (value, i) => value === QUESTIONS[i].answer,
  ).length;

  return (
    <ChalkboardPanel title="Check your understanding">
      <div className="flex flex-col gap-8">
        {QUESTIONS.map((question, questionIndex) => {
          const choice = selected[questionIndex];
          return (
            <div key={question.prompt} className="flex flex-col gap-3">
              <p className="handwritten text-lg text-white">
                {questionIndex + 1}. {question.prompt}
              </p>
              <div className="flex flex-wrap gap-2">
                {question.options.map((option, optionIndex) => {
                  const isChosen = choice === optionIndex;
                  return (
                    <ChalkButton
                      key={option}
                      active={isChosen}
                      onClick={() => choose(questionIndex, optionIndex)}
                    >
                      {option}
                      {isChosen
                        ? optionIndex === question.answer
                          ? " ✓"
                          : " ✗"
                        : ""}
                    </ChalkButton>
                  );
                })}
              </div>
            </div>
          );
        })}

        {answered === QUESTIONS.length && (
          <p className="handwritten text-xl text-white">
            {correct} out of {QUESTIONS.length} correct.
          </p>
        )}
      </div>
    </ChalkboardPanel>
  );
}
