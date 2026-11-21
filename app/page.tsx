import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-maroon">Cloakroom · test app</p>
        <h1 className="h1 mt-1">See any saree on you, without draping it</h1>
        <p className="mt-2 text-sm text-stone-600">
          This app tests two ways of making a virtual try-on, using two different AI models, so you can see which one copies the saree most accurately.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <Link href="/catalog/new" className="card block active:scale-[0.99]">
          <div className="text-2xl">🧵</div>
          <h2 className="mt-1 font-semibold">1. Add sarees</h2>
          <p className="text-sm text-stone-600">Photograph each saree folded on a table, with its labelled parts showing.</p>
        </Link>
        <Link href="/try" className="card block active:scale-[0.99]">
          <div className="text-2xl">✨</div>
          <h2 className="mt-1 font-semibold">2. Try on</h2>
          <p className="text-sm text-stone-600">Pick sarees, take the customer&apos;s photo, and get try-on images side by side.</p>
        </Link>
        <Link href="/results" className="card block active:scale-[0.99]">
          <div className="text-2xl">📊</div>
          <h2 className="mt-1 font-semibold">3. Compare</h2>
          <p className="text-sm text-stone-600">Rate each image, then see which approach and model wins.</p>
        </Link>
      </div>

      <section className="card space-y-3">
        <h2 className="font-semibold">What is being compared</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl bg-amber-50 p-3">
            <p className="font-medium">Approach A: Describe first</p>
            <p className="text-sm text-stone-600">
              The AI reads the saree photo once and writes a detailed description (body, borders, pallu, blouse). The image model only gets this description plus the customer&apos;s photo.
            </p>
          </div>
          <div className="rounded-xl bg-sky-50 p-3">
            <p className="font-medium">Approach B: Direct photo</p>
            <p className="text-sm text-stone-600">
              The image model gets the labelled saree photo itself plus the customer&apos;s photo, and has to work out the drape on its own.
            </p>
          </div>
        </div>
        <p className="text-sm text-stone-600">
          Each approach runs on <b>OpenAI</b> and <b>Gemini</b>, giving 4 images per saree. Rate each image on <i>saree accuracy</i> and <i>face likeness</i>.
        </p>
      </section>
    </div>
  );
}
