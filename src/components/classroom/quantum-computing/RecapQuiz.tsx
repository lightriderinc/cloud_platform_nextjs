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
    prompt: "What can a qubit do that a classical bit can't?",
    options: [
      "Store more than one bit of classical data",
      "Exist in a superposition of 0 and 1 at once",
      "Run faster than a transistor",
      "Hold a negative value",
    ],
    answer: 1,
  },
  {
    prompt:
      "A qubit with equal amplitudes on |0⟩ and |1⟩ sits where on the Bloch sphere?",
    options: ["At the north pole", "At the south pole", "On the equator", "Outside the sphere"],
    answer: 2,
  },
  {
    prompt: "What happens to a qubit's state when you measure it?",
    options: [
      "Nothing changes",
      "It collapses to one of the possible outcomes",
      "It doubles its amplitude",
      "It becomes entangled",
    ],
    answer: 1,
  },
  {
    prompt: "Which gate puts a qubit starting at |0⟩ into an equal superposition?",
    options: ["X", "Z", "H", "S"],
    answer: 2,
  },
  {
    prompt: "In the Bell pair circuit, what does the CNOT gate do?",
    options: [
      "Measures both qubits",
      "Flips the target qubit only when the control qubit is 1",
      "Rotates the control qubit by 90 degrees",
      "Resets both qubits to |0⟩",
    ],
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
                      correct={isChosen && optionIndex === question.answer}
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
