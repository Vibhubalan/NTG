import {
  resolveValorantRoleKey,
  VALORANT_ROLE_ICON_SRC,
  type ValorantRoleKey,
} from "@/lib/valorant-role-icons";

type Props = {
  role: string | ValorantRoleKey;
  className?: string;
  alt?: string;
  title?: string;
  /** When false, Flex is not upscaled (use next to trophies / dense rows). */
  boostFlex?: boolean;
};

/** Official-style Valorant role mark (Controller / Duelist / Initiator / Sentinel / Flex). */
export default function ValorantRoleIcon({
  role,
  className = "h-4 w-4",
  alt,
  title,
  boostFlex = true,
}: Props) {
  const key = resolveValorantRoleKey(role);
  if (!key) return null;
  const src = VALORANT_ROLE_ICON_SRC[key];
  const label = alt ?? key;
  // Flex crest reads smaller than the circular role marks — boost visual size.
  const flexScale = key === "flex" && boostFlex ? " scale-[1.45]" : "";

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={label}
      title={title ?? label}
      className={`inline-block object-contain${flexScale} ${className}`}
      draggable={false}
    />
  );
}
