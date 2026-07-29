import { MdWarningAmber } from "react-icons/md";

export default function WarningBox({children}: {children: React.ReactNode}) {
  return (
    <>
      <div className="flex flex-row items-start gap-2 border-l-2 border-amber-400 pl-3 pr-6 py-2 bg-amber-50 default-radius">
        <MdWarningAmber className="text-lg text-amber-500 shrink-0" />
        <p className="text-xs text-black">
          {children}
        </p>
      </div>
    </>
  );
}
