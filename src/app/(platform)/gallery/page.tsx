import PlatformHeader from "@/components/platform/shell/PlatformHeader";
import GalleryGrid from "@/components/platform/GalleryGrid";
import { getMomentsGallery } from "@socials-gallery/index";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Moments",
};

export default async function GalleryPage() {
  const gallery = await getMomentsGallery();

  return (
    <>
      <PlatformHeader
        eyebrow="Social"
        title="Moments from the lounge"
        subtitle="Community nights, cups, and the arena. Follow @ntg_lounge for more."
      />
      <GalleryGrid gallery={gallery} />
    </>
  );
}
