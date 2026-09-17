"use client";

import CircuitSchematic from "@/components/quantum/CircuitSchematic";
import { useEffect, useRef, useState } from "react";
import { MdArrowBack, MdArrowForward } from "react-icons/md";
import LRButton from "../../ui/LRButton";
import CourseHeader from "../course/CourseHeader";
import CourseMobileToc from "../course/CourseMobileToc";
import CourseSection from "../course/CourseSection";
import CourseTableOfContents from "../course/CourseTableOfContents";
import BellStateSimulator from "./BellStateSimulator";
import BlochSphereExplorer from "./BlochSphereExplorer";
import CircuitPresetsPanel from "./CircuitPresetsPanel";
import QuantumGateExplorer from "./QuantumGateExplorer";
import QubitSuperpositionDemo from "./QubitSuperpositionDemo";
import RecapQuiz from "./RecapQuiz";

const SECTIONS = [
  {
    id: "qubits",
    title: "Qubits",
    content: (
      <>
        <p>
          A classical bit is always definitely 0 or definitely 1. A qubit can
          be prepared in a mix of both at once, a state called{" "}
          <strong>superposition</strong>. Physically a qubit might be the
          polarization of a photon, the spin of an electron, or a
          superconducting circuit cooled close to absolute zero.
        </p>
        <p>
          The state of a qubit is written with two numbers called
          amplitudes, one attached to 0 and one attached to 1:
        </p>
        <p className="font-mono text-sm bg-gray-50 border border-gray-200 rounded px-3 py-2 w-fit">
          |ψ⟩ = α|0⟩ + β|1⟩
        </p>
        <p>
          Amplitudes can be negative, or even complex numbers, but they
          always satisfy |α|² + |β|² = 1. You never read α and β directly.
          Measuring the qubit gives you a single binary digit, 0 or 1, and
          the odds of each outcome come from those amplitudes: P(0) = |α|²
          and P(1) = |β|². That rule for turning amplitudes into
          probabilities is called the Born rule.
        </p>
        <p>
          Set the slider below somewhere between a pure |0⟩ and a pure |1⟩,
          then measure it a few times. Each measurement collapses the qubit
          to one definite outcome, the way a flipped coin lands on one face
          the moment you look, except here the qubit was genuinely
          undetermined until that happened.
        </p>
        <QubitSuperpositionDemo />
      </>
    ),
  },
  {
    id: "bloch-sphere",
    title: "The Bloch sphere",
    content: (
      <>
        <p>
          Since a single qubit&apos;s state is just two numbers constrained by
          |α|² + |β|² = 1, the whole state fits on the surface of a sphere.
          That picture is called the <strong>Bloch sphere</strong>. The north
          pole is |0⟩, the south pole is |1⟩, and every other point is some
          mix of the two.
        </p>
        <p>
          Points on the equator are equal mixes of |0⟩ and |1⟩, such as |+⟩
          and |−⟩. They give identical measurement odds (50/50 either way)
          but sit on opposite sides of the sphere, because the amplitudes
          themselves differ even when the probabilities don&apos;t. Two states
          that look the same under measurement can still be genuinely
          different quantum states, and gates can tell them apart even
          though a single measurement can&apos;t.
        </p>
        <p>Try a few of the six marked states and see where they land.</p>
        <BlochSphereExplorer />
      </>
    ),
  },
  {
    id: "gates",
    title: "Quantum gates",
    content: (
      <>
        <p>
          A quantum gate takes a qubit&apos;s state and moves it to a new point on
          the sphere. Every gate here is reversible, and unlike classical
          logic gates, most of them aren&apos;t their own inverse, so applying one
          twice usually lands you somewhere new rather than back where you
          started.
        </p>
        <p>A handful of gates come up constantly:</p>
        <ul className="list-disc pl-6 flex flex-col gap-1">
          <li>
            <strong>X</strong> swaps the roles of |0⟩ and |1⟩, the closest
            thing to a classical NOT.
          </li>
          <li>
            <strong>Z</strong> leaves the measurement odds alone but flips
            the sign of β, moving the state to the opposite side of the
            sphere.
          </li>
          <li>
            <strong>H</strong> (Hadamard) rotates |0⟩ or |1⟩ onto the
            equator. It&apos;s the gate that puts a qubit into an even
            superposition in the first place.
          </li>
        </ul>
        <p>
          Two more, Y and S, round out the explorer below. Gates chain
          together the same way logic gates do: apply one, then feed the
          result into the next.
        </p>
        <p>
          Start from |0⟩ and apply a few gates to see how each one moves the
          state.
        </p>
        <QuantumGateExplorer />
      </>
    ),
  },
  {
    id: "circuits",
    title: "Quantum circuits",
    content: (
      <>
        <p>
          A quantum circuit is a set of instructions for a quantum computer,
          drawn as one horizontal line per qubit, called a wire. Time runs
          left to right along each wire. Every gate from the last section
          shows up as a box sitting on the wire it acts on, and a small
          meter symbol at the end marks where a qubit gets measured and
          turned into an ordinary 0 or 1.
        </p>
        <p>
          Here&apos;s the simplest circuit that does anything interesting:
          one qubit, one H gate, one measurement.
        </p>
        <CircuitSchematic circuit="h" className="w-fit" />
        <p>
          This circuit doesn&apos;t compute in the usual sense. It puts the
          qubit into an even superposition and lets the measurement pick 0
          or 1 with genuinely equal odds. That&apos;s already a real use
          case: a coin flip built out of superposition rather than assumed
          randomness is exactly how a quantum random number generator
          works, and it&apos;s one of the few quantum applications already
          running as an ordinary product today.
        </p>
        <p>
          Add a second qubit and a CNOT gate and the same idea builds
          something with no classical equivalent: an entangled pair,
          covered next.
        </p>
        <p>
          The H gate circuit above is a ready-made preset on Light Rider
          Quantum. Submit it and it shows up as a job you can track.
        </p>
        <CircuitPresetsPanel circuit="h" />
      </>
    ),
  },
  {
    id: "entanglement",
    title: "Entanglement",
    content: (
      <>
        <p>
          Two qubits are entangled when their combined state can&apos;t be split
          into a separate state for each qubit on its own. Measuring one
          instantly tells you something about the other, no matter how far
          apart they physically are. That&apos;s not a way to send information,
          but it is a real correlation with no classical explanation.
        </p>
        <p>
          The standard way to build an entangled pair, called a{" "}
          <strong>Bell state</strong>, is an H gate on one qubit followed by
          a CNOT gate controlled by that qubit and targeting the other. CNOT
          flips its target qubit only when its control qubit is 1. Drawn as
          a circuit, it looks like this:
        </p>
        <CircuitSchematic circuit="bell" className="w-fit" />
        <p>
          Past the entanglement itself, this exact circuit doubles as a
          standard hardware benchmark. It&apos;s small enough to run in a
          fraction of a second and sensitive enough to noise that providers
          use it to check how well a chip actually preserves entanglement.
          It&apos;s also a ready-made preset you can submit right now.
        </p>
        <CircuitPresetsPanel circuit="bell" />
        <p>Step through the circuit below and measure the pair a few times.</p>
        <BellStateSimulator />
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

export default function QuantumComputingCourse() {
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
        title="Quantum computing basics"
        description="Qubits, the Bloch sphere, gates, circuits, and entanglement."
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
