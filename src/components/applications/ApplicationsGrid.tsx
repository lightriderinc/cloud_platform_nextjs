"use client";

import { useState } from "react";
import { FaDiceD20 } from "react-icons/fa6";
import { PiPasswordFill } from "react-icons/pi";
import { MdLock, MdBolt } from "react-icons/md";

import ApplicationCard from "./ApplicationCard";
import DiceRollModal from "./DiceRollModal";
import PasswordModal from "./PasswordModal";
import QuantumVaultModal from "./QuantumVaultModal";
import CurbyEntropyModal from "./CurbyEntropyModal";

type OpenModal = "dice" | "password" | "vault" | "curby" | null;

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

        <ApplicationCard
          title="Quantum Vault"
          description="Share secrets that stay safe even against future quantum computers."
          icon={MdLock}
          tag="New"
          onClick={() => setOpenModal("vault")}
        />

        <ApplicationCard
          title="Fetch Quantum Entropy"
          description="Fetch real quantum randomness from CURBy and view its health."
          icon={MdBolt}
          tag="New"
          onClick={() => setOpenModal("curby")}
        />
      </div>

      {openModal === "dice" && (
        <DiceRollModal onClose={() => setOpenModal(null)} />
      )}

      {openModal === "password" && (
        <PasswordModal onClose={() => setOpenModal(null)} />
      )}

      {openModal === "vault" && (
        <QuantumVaultModal onClose={() => setOpenModal(null)} />
      )}

      {openModal === "curby" && (
        <CurbyEntropyModal onClose={() => setOpenModal(null)} />
      )}
    </>
  );
}