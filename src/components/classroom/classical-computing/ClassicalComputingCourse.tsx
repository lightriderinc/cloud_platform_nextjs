"use client";

import { useEffect, useRef, useState } from "react";
import { MdArrowBack, MdArrowForward } from "react-icons/md";
import LRButton from "../../ui/LRButton";
import CourseHeader from "../course/CourseHeader";
import CourseMobileToc from "../course/CourseMobileToc";
import CourseSection from "../course/CourseSection";
import CourseTableOfContents from "../course/CourseTableOfContents";
import BitToggler from "./BitToggler";
import HalfAdderSimulator from "./HalfAdderSimulator";
import LogicGateExplorer from "./LogicGateExplorer";
import RecapQuiz from "./RecapQuiz";

const BOOLEAN_TABLE_ROWS: [number, number][] = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
];

const SECTIONS = [
  {
    id: "bits",
    title: "Bits",
    content: (
      <>
        <p>
          A digital computer stores and moves information as bits. A bit has
          exactly two possible states, usually written as 0 and 1. Physically,
          a bit might be a transistor that&apos;s on or off, a capacitor
          that&apos;s charged or not, or a spot on a disk magnetized one way
          or the other. The hardware only needs to tell two states apart
          reliably.
        </p>
        <p>
          A single bit is enough for a yes/no answer, but most information
          needs more than two values, so computers group bits together and
          read them as a binary number.
        </p>
        <p>
          In binary, each position is worth twice the position to its right,
          the same way each digit in a decimal number is worth ten times the
          digit to its right. Reading from the right, the positions are worth
          1, 2, 4, 8, and so on.
        </p>
        <p>
          To find the value of a binary number, add up the place values
          wherever there&apos;s a 1:
        </p>
        <p className="font-mono text-sm bg-gray-50 border border-gray-200 rounded px-3 py-2 w-fit">
          1011 = 8 + 0 + 2 + 1 = 11
        </p>
        <p>
          Click the squares below to flip each bit between 0 and 1, and watch
          the value update.
        </p>
        <BitToggler />
      </>
    ),
  },
  {
    id: "boolean-algebra",
    title: "Boolean algebra",
    content: (
      <>
        <p>
          Once information is stored as bits, a computer needs a way to
          combine them into new bits. That&apos;s boolean algebra, where every value is either 0 (false) or 1 (true).
        </p>
        <p>Three operations cover most of it:</p>
        <ul className="list-disc pl-6 flex flex-col gap-1">
          <li>
            <strong>NOT</strong> flips a single value: NOT 0 = 1, NOT 1 = 0.
          </li>
          <li>
            <strong>AND</strong> is 1 only when both inputs are 1.
          </li>
          <li>
            <strong>OR</strong> is 1 when at least one input is 1.
          </li>
        </ul>
        <p>
          A fourth operation, <strong>XOR</strong> (exclusive or), is 1 when
          the inputs differ. It shows up constantly in arithmetic and error
          checking.
        </p>
        <div className="overflow-x-auto">
          <table className="text-sm border border-gray-200 rounded">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-3 py-2 text-left font-medium">A</th>
                <th className="px-3 py-2 text-left font-medium">B</th>
                <th className="px-3 py-2 text-left font-medium">AND</th>
                <th className="px-3 py-2 text-left font-medium">OR</th>
                <th className="px-3 py-2 text-left font-medium">XOR</th>
              </tr>
            </thead>
            <tbody>
              {BOOLEAN_TABLE_ROWS.map(([a, b]) => (
                <tr
                  key={`${a}${b}`}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="px-3 py-2">{a}</td>
                  <td className="px-3 py-2">{b}</td>
                  <td className="px-3 py-2">{a & b}</td>
                  <td className="px-3 py-2">{a | b}</td>
                  <td className="px-3 py-2">{a ^ b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    ),
  },
  {
    id: "gates",
    title: "Logic gates",
    content: (
      <>
        <p>
          A logic gate is a small piece of hardware that implements one
          boolean operation directly, wired together from transistors.
          Circuits are built by connecting the output of one gate to the
          input of another, so a handful of simple gates combine into
          components that do arithmetic, store memory, or make decisions.
        </p>
        <p>Pick a gate and flip its inputs to see the output it produces.</p>
        <LogicGateExplorer />
      </>
    ),
  },
  {
    id: "circuits",
    title: "Building a circuit",
    content: (
      <>
        <p>
          Gates by themselves don&apos;t do much. The point is combining
          gates to create a circuit. A half adder is the simplest arithmetic circuit: it adds two
          single bits together.
        </p>
        <p>
          It&apos;s called a &quot;half&quot; adder because it only handles
          two input bits, with no way to fold in a carry from a previous
          column. If we wire two gates together, it can add A and B; a{" "}
          <strong>full adder</strong> adds a third input, the carry-in, so
          adders can be chained to add numbers wider than a single bit.
        </p>
        <p>
          Adding two bits produces two results: a sum bit, and a carry bit
          for when the result needs a second digit (1 + 1 is 10 in binary).
          Written with the gates from the last section:
        </p>
        <ul className="list-disc pl-6 flex flex-col gap-1">
          <li>the sum is A XOR B</li>
          <li>the carry is A AND B</li>
        </ul>
        <p>
          Both gates read the same two inputs, they just disagree on what
          counts as &quot;interesting.&quot; XOR fires whenever A and B
          differ, which is exactly when their sum is 1 without overflowing.
          AND fires only when both are 1, which is exactly when the sum
          needs that second digit. Put side by side, the two gates cover
          every case in the addition table.
        </p>
        <div className="overflow-x-auto">
          <table className="text-sm border border-gray-200 rounded">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-3 py-2 text-left font-medium">A</th>
                <th className="px-3 py-2 text-left font-medium">B</th>
                <th className="px-3 py-2 text-left font-medium">Sum</th>
                <th className="px-3 py-2 text-left font-medium">Carry</th>
              </tr>
            </thead>
            <tbody>
              {BOOLEAN_TABLE_ROWS.map(([a, b]) => (
                <tr
                  key={`${a}${b}`}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="px-3 py-2">{a}</td>
                  <td className="px-3 py-2">{b}</td>
                  <td className="px-3 py-2">{a ^ b}</td>
                  <td className="px-3 py-2">{a & b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>Toggle A and B below to see both outputs.</p>
        <HalfAdderSimulator />
        <p>
          Chain enough half adders together, with a small adjustment for
          carries, and you can add numbers of any size. This is the same arithmetic
          a CPU runs on every clock cycle.
        </p>
      </>
    ),
  },
  {
    id: "recap",
    title: "Check your understanding",
    content: (
      <>
        <p>A few questions covering what this course walked through.</p>
        <RecapQuiz />
      </>
    ),
  },
];

export default function ClassicalComputingCourse() {
  const [activeIndex, setActiveIndex] = useState(0);
  const sectionTopRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    sectionTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeIndex]);

  const activeSection = SECTIONS[activeIndex];
  const isFirst = activeIndex === 0;
  const isLast = activeIndex === SECTIONS.length - 1;

  const goToIndex = (index: number) => setActiveIndex(index);
  const goToId = (id: string) => {
    const index = SECTIONS.findIndex((section) => section.id === id);
    if (index !== -1) goToIndex(index);
  };

  return (
    <div className="max-w-6xl">
      <CourseHeader
        title="Classical computing basics"
        description="Bits, boolean logic, and the gates built from them."
      />

      <div className="lg:flex lg:items-start justify-between lg:gap-16">
        <div className="min-w-0 max-w-3xl flex-1">
          <CourseMobileToc
            sections={SECTIONS}
            activeId={activeSection.id}
            onSelect={goToId}
          />

          <div ref={sectionTopRef} className="scroll-mt-24">
            <CourseSection id={activeSection.id} title={activeSection.title}>
              {activeSection.content}
            </CourseSection>
          </div>

          <div className="flex items-center justify-between pt-6">
            {!isFirst ? (
              <LRButton
                variant="secondary-outline"
                icon={<MdArrowBack />}
                onClick={() => goToIndex(activeIndex - 1)}
              >
                Back
              </LRButton>
            ) : (
              <span />
            )}

            {!isLast && (
              <LRButton
                variant="primary"
                icon={<MdArrowForward />}
                iconPosition="right"
                onClick={() => goToIndex(activeIndex + 1)}
              >
                Next
              </LRButton>
            )}
          </div>
        </div>

        <aside className="shrink-0 lg:w-48 lg:sticky lg:top-0 lg:self-start ">
          <CourseTableOfContents
            sections={SECTIONS}
            activeId={activeSection.id}
            onSelect={goToId}
          />
        </aside>
      </div>
    </div>
  );
}
