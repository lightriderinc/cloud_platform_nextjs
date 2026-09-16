import CourseHeader from "../course/CourseHeader";
import CourseSection from "../course/CourseSection";
import CourseTableOfContents from "../course/CourseTableOfContents";
import BitToggler from "./BitToggler";
import LogicGateExplorer from "./LogicGateExplorer";
import HalfAdderSimulator from "./HalfAdderSimulator";
import RecapQuiz from "./RecapQuiz";

const SECTIONS = [
  { id: "bits", title: "Bits" },
  { id: "boolean-algebra", title: "Boolean algebra" },
  { id: "gates", title: "Logic gates" },
  { id: "circuits", title: "Building a circuit" },
  { id: "recap", title: "Check your understanding" },
];

const BOOLEAN_TABLE_ROWS: [number, number][] = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
];

export default function ClassicalComputingCourse() {
  return (
    <div className="max-w-6xl">
      <CourseHeader
        title="Classical computing basics"
        description="Bits, boolean logic, and the gates built from them."
      />

      <div className="lg:flex lg:items-start lg:gap-16">
        <div className="min-w-0 max-w-3xl flex-1">
          <CourseSection id="bits" title="Bits">
            <p>
              A digital computer stores and moves information as bits. A bit
              has exactly two possible states, usually written as 0 and 1.
              Physically, a bit might be a transistor that&apos;s on or off,
              a capacitor that&apos;s charged or not, or a spot on a disk
              magnetized one way or the other — the hardware only needs to
              tell two states apart reliably.
            </p>
            <p>
              A single bit is enough for a yes/no answer, but most
              information needs more than two values, so computers group
              bits together and read them as a binary number.
            </p>
            <p>
              In binary, each position is worth twice the position to its
              right, the same way each digit in a decimal number is worth
              ten times the digit to its right. Reading from the right, the
              positions are worth 1, 2, 4, 8, and so on.
            </p>
            <p>
              To find the value of a binary number, add up the place values
              wherever there&apos;s a 1:
            </p>
            <p className="font-mono text-sm bg-gray-50 border border-gray-200 rounded px-3 py-2 w-fit">
              1011 = 8 + 0 + 2 + 1 = 11
            </p>
            <p>
              Click the squares below to flip each bit between 0 and 1, and
              watch the value update.
            </p>
            <BitToggler />
          </CourseSection>

          <CourseSection id="boolean-algebra" title="Boolean algebra">
            <p>
              Once information is stored as bits, a computer needs a way to
              combine them into new bits. That&apos;s boolean algebra — an
              algebra where every value is either 0 (false) or 1 (true).
            </p>
            <p>Three operations cover most of it:</p>
            <ul className="list-disc pl-6 flex flex-col gap-1">
              <li>
                <strong>NOT</strong> flips a single value: NOT 0 = 1, NOT 1 =
                0.
              </li>
              <li>
                <strong>AND</strong> is 1 only when both inputs are 1.
              </li>
              <li>
                <strong>OR</strong> is 1 when at least one input is 1.
              </li>
            </ul>
            <p>
              A fourth operation, <strong>XOR</strong> (exclusive or), is 1
              when the inputs differ. It shows up constantly in arithmetic
              and error checking.
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
          </CourseSection>

          <CourseSection id="gates" title="Logic gates">
            <p>
              A logic gate is a small piece of hardware that implements one
              boolean operation directly, wired together from transistors.
              Circuits are built by connecting the output of one gate to the
              input of another, so a handful of simple gates combine into
              components that do arithmetic, store memory, or make
              decisions.
            </p>
            <p>
              Pick a gate and flip its inputs to see the output it produces.
            </p>
            <LogicGateExplorer />
          </CourseSection>

          <CourseSection id="circuits" title="Building a circuit">
            <p>
              Gates by themselves don&apos;t do much — the point is
              combining them. A half adder is the simplest arithmetic
              circuit: it adds two single bits together.
            </p>
            <p>
              Adding two bits produces two results: a sum bit, and a carry
              bit for when the result needs a second digit (1 + 1 is 10 in
              binary). Written with the gates from the last section:
            </p>
            <ul className="list-disc pl-6 flex flex-col gap-1">
              <li>the sum is A XOR B</li>
              <li>the carry is A AND B</li>
            </ul>
            <p>Toggle A and B below to see both outputs.</p>
            <HalfAdderSimulator />
            <p>
              Chain enough half adders together, with a small adjustment for
              carries, and you can add numbers of any size — the same
              arithmetic a CPU runs on every clock cycle.
            </p>
          </CourseSection>

          <CourseSection id="recap" title="Check your understanding">
            <p>A few questions covering what this page walked through.</p>
            <RecapQuiz />
          </CourseSection>
        </div>

        <aside className="hidden shrink-0 lg:block lg:w-48">
          <CourseTableOfContents sections={SECTIONS} />
        </aside>
      </div>
    </div>
  );
}
