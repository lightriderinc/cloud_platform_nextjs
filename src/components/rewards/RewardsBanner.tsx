import { REFERRAL_REWARD_CENTS } from "@/lib/billing/referrals";
import { HiGiftTop } from "react-icons/hi2";
import { PiCoinsFill } from "react-icons/pi";

const REWARD_CREDITS = REFERRAL_REWARD_CENTS.toLocaleString("en-US");

const STEPS = [
  { title: "Send an invite", body: "Up to 15 invites per day using the recipients' email address." },
  {
    title: "They get started",
    body: "They purchase their first credits or run a QPU job.",
  },
  {
    title: "You both earn",
    body: `${REWARD_CREDITS} credits are added to both your accounts.`,
  },
];

export default function RewardsBanner() {
  return (
    <section
      aria-labelledby="rewards-banner-title"
      className="relative isolate w-full overflow-hidden default-radius bg-linear-125 from-violet-700 via-purple-600 to-fuchsia-500 p-6 text-white shadow-lg shadow-violet-500/20 sm:p-8"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-15 -left-16 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute -right-10 xl:left-130 -bottom-28 h-72 w-72 rounded-full bg-fuchsia-300/20 blur-3xl" />
        <HiGiftTop className="absolute -right-6 xl:left-130 -bottom-10 text-[18rem] text-white/10 rotate-12 " />
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] xl:items-center">
        <div className="flex flex-col h-full items-start justify-between">
          <span className="inline-flex items-center gap-1 rounded bg-white/10 px-3 py-1 text-xs  text-white ring-1 ring-white/30 backdrop-blur-sm">
            Light Rider{" "}
            <span className="font-medium">Refer & Earn program</span>
          </span>

          <h2
            id="rewards-banner-title"
            className="mt-5 flex items-center gap-4"
          >
            <PiCoinsFill className="text-8xl opacity-50" />

            <span className="flex flex-col">
              <span className="text-4xl leading-none font-medium tracking-tight tabular-nums sm:text-5xl">
                {REWARD_CREDITS} credits
              </span>
              <span className="mt-2 text-base font-medium text-white sm:text-lg">
                for you and every person you invite
              </span>
            </span>
          </h2>
        </div>

        <ol className="flex flex-col gap-6 default-radius bg-white/15 p-4 ring-1 ring-white/20 backdrop-blur-sm">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex items-start gap-3">
              <span
                aria-hidden
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-violet-700"
              >
                {i + 1}
              </span>
              <div>
                <span className="text-md font-medium">{step.title}</span>
                <p className="text-sm text-white">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
