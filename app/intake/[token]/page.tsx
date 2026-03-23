import { notFound } from "next/navigation";
import { getArtistByIntakeToken } from "@/lib/actions/intake";
import { IntakeForm } from "@/components/intake/IntakeForm";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function IntakePage({ params }: Props) {
  const { token } = await params;
  const artist = await getArtistByIntakeToken(token);
  if (!artist) notFound();

  return <IntakeForm artist={artist} />;
}
