"use client";

import { useState } from "react";
import { FaDiceD20 } from "react-icons/fa6";
import { PiPasswordFill } from "react-icons/pi";
import {
  MdLock,
  MdEdit,
  MdChecklist,
  MdLeaderboard,
  MdPublic,
  MdInsertChart,
  MdAssignmentTurnedIn,
} from "react-icons/md";
import ApplicationCard from "./ApplicationCard";
import DiceRollModal from "./DiceRollModal";
import PasswordModal from "./PasswordModal";
import QuantumVaultModal from "./QuantumVaultModal";
import QuantumSignerModal from "./QuantumSignerModal";
import PqcReadinessModal from "./PqcReadinessModal";



type OpenModal =
  | "dice"
  | "password"
  | "vault"
  | "signer"
  | "pqcReadiness"
  | "prioritization"
  | "geodata"
  | "benchmark"
  | "readinessCanvas"
  | null;

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
          description="Encrypts a secret using ML-KEM-768 and AES-256-GCM."
          icon={MdLock}
          tag="New"
          onClick={() => setOpenModal("vault")}
        />

        <ApplicationCard
          title="Quantum-Safe Signer"
          description="Signs any text with ML-DSA-65."
          icon={MdEdit}
          tag="New"
          onClick={() => setOpenModal("signer")}
        />
        <ApplicationCard
          title="PQC Migration Readiness"
          description="Check your systems against real NIST and NSA post-quantum deadlines."
          icon={MdChecklist}
          tag="New"
          onClick={() => setOpenModal("pqcReadiness")}
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
      {openModal === "pqcReadiness" && (
        <PqcReadinessModal onClose={() => setOpenModal(null)} />
      )}
    </>
  );
}