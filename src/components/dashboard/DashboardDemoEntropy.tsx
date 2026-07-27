import Link from "next/link";
import { FaDice } from "react-icons/fa";

export default function DashboardDemoEntropy() {
  return (
    <div className="flex flex-col w-full gap-10 min-w-50 bg-gray-100 p-4 default-radius border border-gray-100 card-hover-primary opacity-80">
      <div className="flex flex-row gap-4">
        <div>
          <FaDice className="text-2xl text-gray-400" />
        </div>
        <div className="flex flex-col gap-0">
          <h2 className="text-l font-bold">Get Entropy</h2>
          <p className="text-sm text-gray-600">
            Generate certified entropy from hardware and beacon sources.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Link
          href=""
          className="default-radius inline-flex items-center justify-center pl-4 pr-3 py-2.5 text-sm font-medium text-gray-600 cursor-pointer transition-opacity opacity-80 min-w-[110px] bg-gray-200"
        >
          Coming soon
        </Link>
      </div>
    </div>
  );
}
