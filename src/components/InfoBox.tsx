import { MdInfoOutline } from "react-icons/md";

export default function InfoBox({children}: {children: React.ReactNode}) {
  return (
    <>
      <div className="flex flex-row items-start gap-2 border-l-2 border-blue-400 pl-3 pr-6 py-2 bg-blue-100 default-radius">
        <MdInfoOutline className="text-lg text-blue-400" />
        <p className="text-xs text-black">
          {children}
        </p>
      </div>
    </>
  );
}
