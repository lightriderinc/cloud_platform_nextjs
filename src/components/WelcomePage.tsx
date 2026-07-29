import { handleSignIn } from "@/app/actions/auth";
import { IoDocumentTextSharp } from "react-icons/io5";
import { RiCpuFill } from "react-icons/ri";
import LoginButton from "./auth/LoginButton";
import WelcomePageCard from "./WelcomePageCard";
import LRButton from "@/components/ui/LRButton";

export default function WelcomePage() {
  return (
    <div className="flex flex-col">
      <main className="py-3">
        <div className="flex flex-col mb-16">
          <h1 className="hero font-semibold text-gray-700 mb-4">
            Welcome to <br /> Light Rider{" "}
            <span className="color-brand-primary">Cloud</span>.
          </h1>
          <p>
            Start using quantum, today. <br />
            Run circuits on quantum processors and simulators from IQM and Rigetti.
          </p>
        </div>
        <div className="flex flex-col mb-12">
          <h2 className="mb-4 font-semibold text-gray-600">
            Login to access your dashboard or contact us for custom solutions.
          </h2>
          <div className="flex flex-row gap-2">
            <div>
              <LoginButton onSignIn={handleSignIn} />
            </div>
            <a href="https://www.lightriderinc.com/contact" target="_blank" rel="noopener noreferrer">
              <LRButton
                type="button"
                variant="primary-outline"
                className="min-w-[110px] w-full"
              >
                Contact us
              </LRButton>
            </a>
          </div>
        </div>
        <div>
          <h2 className="mb-4 font-semibold text-gray-600">Getting started</h2>
          <div className="flex flex-row gap-3">
            <WelcomePageCard
              href="/backends"
              title="Explore available backends"
              icon={RiCpuFill}
            />
            <WelcomePageCard
              href="https://docs.lightriderinc.com/sdk/getting-started.html"
              title="SDK documentation"
              icon={IoDocumentTextSharp}
              external
            />
          </div>
        </div>
      </main>
    </div>
  );
}
