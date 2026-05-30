/**
 * 기록 상세/수정 (/record/[id])
 * 기록 보기 + 수정 + "카드 만들기" CTA (Phase 1에서 구현)
 */
export default async function RecordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-white px-6">
      <div className="mx-auto w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-[#1A56DB]">기록 상세</h1>
        <p className="mt-2 text-slate-500">record id: {id} (구현 예정)</p>
      </div>
    </main>
  );
}
