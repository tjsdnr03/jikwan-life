/**
 * 카드 생성/편집 (/card/[id])
 * 해당 기록(recordId) 기반 카드 미리보기 → 저장/공유 (Phase 1에서 구현)
 */
export default async function CardEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-white px-6">
      <div className="mx-auto w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-[#1A56DB]">카드 편집</h1>
        <p className="mt-2 text-slate-500">record id: {id} (구현 예정)</p>
      </div>
    </main>
  );
}
