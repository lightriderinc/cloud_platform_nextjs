import { handleSignIn } from "@/app/actions/auth";
import { FaFileCode } from "react-icons/fa";
import { RiCpuFill } from "react-icons/ri";
import LoginButton from "./auth/LoginButton";
import WelcomeCodeAnimation from "./ui/WelcomeCodeAnimation";
import WelcomePageCard from "./WelcomePageCard";

export default function WelcomePage() {
  return (
    <div className="flex flex-col">
      <main className="py-3">
        <div className="flex flex-col">
          <h1 className="hero font-semibold text-gray-700 mb-12">
            Welcome to <br /> Light Rider{" "}
            <span className="color-brand-primary">Cloud</span>.
          </h1>
          <div className="flex flex-col xl:flex-row xl:gap-8 xl:mb-2 mb-12">
            <div className="flex flex-col xl:justify-center w-full">
              <div className="flex flex-col mb-8">
                <h2 className="font-bold text-gray-500 text-2xl mb-2">
                  Start using quantum, today.
                </h2>
                <p>
                  Run circuits on quantum processors and simulators from{" "}
                  <span className="font-medium">IQM</span> and{" "}
                  <span className="font-medium">Rigetti</span>{" "}
                  <span className="text-gray-400 font-medium text-2xs">
                    (Coming soon)
                  </span>
                  .
                </p>
              </div>
              <div className="flex flex-col mb-12">
                <div className="flex flex-row gap-2 mb-3">
                  <div>
                    <LoginButton register onSignIn={handleSignIn} />
                  </div>
                </div>
                <div>
                  <p className="text-sm">
                    Need a custom solution?{" "}
                    <a
                      href="https://www.lightriderinc.com/contact"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="brand-link"
                    >
                      Contact us
                    </a>
                  </p>
                </div>
              </div>
            </div>
            <div className="flex w-full xl:justify-center xl:mr-12 xl:items-center drop-shadow-[0_10px_10px_rgba(0,0,0,0.25)]">
              <WelcomeCodeAnimation />
            </div>
          </div>
          <div>
            <h2 className="mb-4 font-semibold text-gray-600">
              Getting started
            </h2>
            <div className="flex flex-row gap-3">
              <WelcomePageCard
                href="/backends"
                title="Explore available backends"
                icon={RiCpuFill}
                description="View available QPUs and simulators."
              />
              <WelcomePageCard
                href="https://docs.lightriderinc.com/platform/sdk/getting-started.html"
                title="SDK documentation"
                icon={FaFileCode}
                external
                description="Learn how to run your first circuit in minutes."
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
