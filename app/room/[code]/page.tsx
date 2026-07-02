import { PhotoboothRoom } from "@/components/PhotoboothRoom";

type RoomPageProps = {
  params: Promise<{
    code: string;
  }>;
};

export default async function RoomPage({ params }: RoomPageProps) {
  const { code } = await params;

  return <PhotoboothRoom roomCode={code.toUpperCase()} />;
}
