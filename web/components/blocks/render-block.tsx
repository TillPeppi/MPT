import type { Block } from "@/types/site";
import { Blog } from "./blog";
import { Contact } from "./contact";
import { Cta } from "./cta";
import { Events } from "./events";
import { Gallery } from "./gallery";
import { Gift } from "./gift";
import { Hero } from "./hero";
import { Hours } from "./hours";
import { Instagram } from "./instagram";
import { Leaderboard } from "./leaderboard";
import { Marquee } from "./marquee";
import { Offers } from "./offers";
import { Pricing } from "./pricing";
import { Reviews } from "./reviews";
import { Schedule } from "./schedule";
import { Shop } from "./shop";
import { Steps } from "./steps";
import { Stories } from "./stories";
import { Team } from "./team";
import { TextMedia } from "./textmedia";
import type { BlockCtx } from "./types";
import { Usp } from "./usp";

/** Ein Block-Typ = eine Komponente. Die Reihenfolge kommt aus der Blockliste der Seite. */
export function RenderBlock({ block, ctx }: { block: Block; ctx: BlockCtx }) {
  switch (block.type) {
    case "hero":
      return <Hero block={block} ctx={ctx} />;
    case "marquee":
      return <Marquee block={block} ctx={ctx} />;
    case "usp":
      return <Usp block={block} ctx={ctx} />;
    case "offers":
      return <Offers block={block} ctx={ctx} />;
    case "schedule":
      return <Schedule block={block} ctx={ctx} />;
    case "pricing":
      return <Pricing block={block} ctx={ctx} />;
    case "team":
      return <Team block={block} ctx={ctx} />;
    case "reviews":
      return <Reviews block={block} ctx={ctx} />;
    case "hours":
      return <Hours block={block} ctx={ctx} />;
    case "stories":
      return <Stories block={block} ctx={ctx} />;
    case "instagram":
      return <Instagram block={block} ctx={ctx} />;
    case "blog":
      return <Blog block={block} ctx={ctx} />;
    case "textmedia":
      return <TextMedia block={block} ctx={ctx} />;
    case "steps":
      return <Steps block={block} ctx={ctx} />;
    case "events":
      return <Events block={block} ctx={ctx} />;
    case "leaderboard":
      return <Leaderboard block={block} ctx={ctx} />;
    case "gift":
      return <Gift block={block} ctx={ctx} />;
    case "cta":
      return <Cta block={block} ctx={ctx} />;
    case "contact":
      return <Contact block={block} ctx={ctx} />;
    case "shop":
      return <Shop block={block} ctx={ctx} />;
    case "gallery":
      return <Gallery block={block} ctx={ctx} />;
    default:
      return null;
  }
}
