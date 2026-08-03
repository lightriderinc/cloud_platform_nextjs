"use client";

import { useState } from "react";
import { FaDiceD20 } from "react-icons/fa6";
import { PiPasswordFill } from "react-icons/pi";
import { MdLock } from "react-icons/md";
import { MdEdit } from "react-icons/md";

import ApplicationCard from "./ApplicationCard";
import DiceRollModal from "./DiceRollModal";
import PasswordModal from "./PasswordModal";
import QuantumVaultModal from "./QuantumVaultModal";
import QuantumSignerModal from "./QuantumSignerModal";
type OpenModal = "dice" | "password" | "vault"  | "signer" | null;

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
          title="Quantum-Safe Signer"
          description="Sign any text with ML-DSA-65 and let anyone independently verify it wasn't altered — no login needed."
          icon={MdEdit}
          tag="New"
          onClick={() => setOpenModal("signer")}
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
      {openModal === "signer" && (
        <QuantumSignerModal onClose={() => setOpenModal(null)} />
      )}
    </>
  );
}