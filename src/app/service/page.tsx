import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { prisma } from "@/lib/prisma";

type Service = {
  id: number;
  label: string;
  url: string;
  imageUrl: string | null;
  order: number;
};

async function getServices(): Promise<Service[]> {
  try {
    return await prisma.service.findMany({
      orderBy: [{ order: "asc" }, { id: "asc" }],
      select: { id: true, label: true, url: true, imageUrl: true, order: true },
    });
  } catch {
    return [];
  }
}

export default async function ServicePage() {
  const services = await getServices();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header homeHref="/" />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* タイトルセクション（トップの Latest / PickUp と同じ書式） */}
          <section className="pt-8 pb-6 border-b border-black/10">
            <div className="flex items-baseline gap-3">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-black">
                Service
              </h1>
              <p className="text-sm text-black/40">サービス一覧</p>
            </div>
          </section>

          {/* バナーグリッド */}
          <section className="pt-8 pb-16">
            {services.length > 0 ? (
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((s) => (
                  <li key={s.id}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block border border-black/10 rounded-sm overflow-hidden hover:opacity-90 hover:shadow-md transition-all"
                    >
                      {s.imageUrl ? (
                        <div className="aspect-[16/9] relative bg-black/5 overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={s.imageUrl}
                            alt={s.label}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      ) : (
                        <div className="aspect-[16/9] flex items-center justify-center bg-black/5">
                          <span className="font-black text-3xl text-black/20">
                            KWR
                          </span>
                        </div>
                      )}
                      <p className="font-medium text-sm text-black text-center py-3 px-3 bg-white">
                        {s.label}
                      </p>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-20">
                <h2 className="text-lg font-bold text-black">
                  サービスはまだ登録されていません
                </h2>
                <p className="text-black/40 text-sm mt-1">
                  管理画面からサービスを追加してください
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
