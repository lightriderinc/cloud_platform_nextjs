"use client";

import { useState } from "react";
import { FaDiceD20 } from "react-icons/fa6";
import { PiPasswordFill } from "react-icons/pi";
import ApplicationCard from "./ApplicationCard";
import DiceRollModal from "./DiceRollModal";
import PasswordModal from "./PasswordModal";

type OpenModal = "dice" | "password" | null;

export default function ApplicationsGrid() {
  const [openModal, setOpenModal] = useState<OpenModal>(null);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 mt-12">
        <ApplicationCard
          title="True random dice roll"
          description="A dice roller powered by quantum entropy, delivering truly random results."
          icon={FaDiceD20}
          tag="Demo"
          onClick={() => setOpenModal("dice")}
        />
        <ApplicationCard
          title="Secure password generator"
          description="Generate strong, unpredictable passwords powered by quantum randomness."
          icon={PiPasswordFill}
          tag="Demo"
          onClick={() => setOpenModal("password")}
        />
      </div>

      {openModal === "dice" && (
        <DiceRollModal onClose={() => setOpenModal(null)} />
      )}
      {openModal === "password" && (
        <PasswordModal onClose={() => setOpenModal(null)} />
      )}
    </>
  );
}
