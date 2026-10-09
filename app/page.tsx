import Image from "next/image";

export default function Home() {
  return (
    <main className="p-4">
      <Image src="/brand/claww-logo.jpg" alt="CLAWW" width={48} height={48} priority />
    </main>
  );
}
