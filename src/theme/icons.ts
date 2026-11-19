import {
  Landmark,
  MailWarning,
  MessageSquareWarning,
  Percent,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Smartphone,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import type { ConceptId, ScamType } from "@/types";

export const conceptIcons: Record<ConceptId, LucideIcon> = {
  "upi-safety": ShieldCheck,
  "fraud-response": Siren,
  reversals: Undo2,
  "interest-credit": Percent,
  "phishing-indicators": MailWarning,
};

export const scamIcons: Record<ScamType, LucideIcon> = {
  "upi-pin-trap": QrCode,
  "wrong-transfer": Undo2,
  "lost-phone": Smartphone,
  "instant-loan": Landmark,
  phishing: MessageSquareWarning,
  "digital-arrest": ShieldAlert,
};
