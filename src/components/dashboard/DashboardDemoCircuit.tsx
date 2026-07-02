import { MdArrowForward } from "react-icons/md";
import { PiCircuitryFill } from "react-icons/pi";

export default function DashboardDemoCircuit() {
  return (
    <>
    <div className="flex flex-col w-full gap-10 min-w-50 bg-gray-100 p-4 rounded border border-gray-200 card-hover-primary">
          <div className="flex flex-row gap-4">
            <div>
              <PiCircuitryFill className="text-2xl text-gray-400"/>
            </div>
            <div className="flex flex-col gap-0">
              <h2 className="text-l font-bold">Submit sample circuits</h2>
              <p className="text-sm text-gray-600">
                Submit sample circuits to IQM Garnet simulator.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              style={{ backgroundColor: "var(--brand-primary)" }}
              className="default-radius pl-4 pr-3 py-2.5 text-sm font-medium text-white cursor-pointer transition-opacity hover:opacity-80 min-w-[110px]"
            >
              Try it out{" "}
              <MdArrowForward className="inline-block ml-1 text-lg" />
            </button>
          </div>
        </div>
    </>
  );
}