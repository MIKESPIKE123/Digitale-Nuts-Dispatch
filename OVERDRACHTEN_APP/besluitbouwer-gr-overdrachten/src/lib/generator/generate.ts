import type { Dossier, Module } from "@/lib/schemas/dossier";
import type { Generated } from "@/lib/generator/types";
import {
  buildAanleiding,
  buildArgumentatie,
  buildBijlagen,
  buildFinancieleGevolgen,
  buildJuridischeGrond,
  commonContext,
  fmtNumberNl,
} from "@/lib/generator/templates";
import { pickNumber, pickText, todo } from "@/lib/todo";
import type { StandardTexts } from "@/lib/standardTexts";
import { applyTokens, mergeTexts } from "@/lib/standardTexts";

function moduleToArticles(
  d: Dossier,
  modules: Module[],
  texts: StandardTexts,
  financieleOpmerkingen: string
) {
  const strict = d.strictFacts;
  const articles: { title: string; text: string }[] = [];
  const ctx = commonContext(d);

  const has = (t: Module["type"]) => modules.some((m) => m.type === t);

  if (has("verwerving")) {
    const m = modules.find((x) => x.type === "verwerving")!;
    const variant = m.payload.variant;
    articles.push({
      title: "Verwerving",
      text:
        applyTokens(variant === "grond+infrastructuurwerken" ? texts.art_verwerving_grondInfra : texts.art_verwerving_grond, ctx as any),
    });
  }

  if (has("affectatieOpenbaarDomein")) {
    articles.push({
      title: "Affectatie openbaar domein",
      text: applyTokens(texts.art_affectatie, ctx as any),
    });
  }

  if (has("opnameLokaalOpenbaarDomein")) {
    const m = modules.find((x) => x.type === "opnameLokaalOpenbaarDomein")!;
    articles.push({
      title: "Opname openbaar domein",
      text: applyTokens(texts.art_opname, {
        ...ctx,
        districtOpname: pickText(m.payload.district, strict, "district opname openbaar domein"),
      }),
    });
  }

  for (const m of modules.filter((x) => x.type === "erfdienstbaarheid")) {
    articles.push({
      title: `Erfdienstbaarheid (${m.payload.subtype})`,
      text: applyTokens(texts.art_erfdienstbaarheid, {
        ...ctx,
        subtype: m.payload.subtype,
        oppervlakteM2: pickNumber(m.payload.oppervlakteM2, strict, "oppervlakte erfdienstbaarheid", fmtNumberNl),
        planrefErfdienstbaarheid: pickText(m.payload.planreferentie, strict, "planref erfdienstbaarheid"),
        heersendDienend: todo(strict, "aanduiding heersend/dienend erf"),
        betrokkenPercelen: (m.payload.betrokkenPercelen || []).join(", ") || todo(strict, "betrokken percelen"),
      }),
    });
  }

  // Financiële gevolgen altijd als voorlaatste
  articles.push({
    title: "Financiële gevolgen",
    text: applyTokens(ctx.kosteloos ? texts.art_financieel_geen : texts.art_financieel_wel, {
      ...ctx,
      financieleOpmerkingen: financieleOpmerkingen,
    }),
  });

  // Opdrachten als laatste
  articles.push({
    title: "Opdrachten",
    text: applyTokens(texts.art_opdrachten, ctx as any),
  });

  return articles;
}

export function generateMarkdown(d: Dossier, texts?: Partial<StandardTexts>): Generated {
  const t = mergeTexts(texts);
  const aanleiding = buildAanleiding(d, t);
  const juridischeGrond = buildJuridischeGrond(d, t);
  const argumentatie = buildArgumentatie(d, t);
  const financieleGevolgen = buildFinancieleGevolgen(d, t);
  const bijlagen = buildBijlagen(d);

  const articleBlocks = moduleToArticles(d, d.modules, t, financieleGevolgen);
  const articles = articleBlocks.map((a, idx) => ({ nr: idx + 1, title: a.title, text: a.text }));

  const besluit = articles.length
    ? articles
        .map((a) => `Artikel ${a.nr}\n\n${a.text}`)
        .join("\n\n")
    : d.strictFacts
      ? t.art_noModules
      : "";

  const sections = {
    aanleiding,
    juridischeGrond,
    argumentatie,
    financieleGevolgen,
    besluit,
    bijlagen,
  };

  const md = [
    `# ${d.core.titel || "Besluit"}`,
    "",
    "## Aanleiding en context",
    sections.aanleiding,
    "",
    "## Juridische grond",
    sections.juridischeGrond,
    "",
    "## Argumentatie",
    sections.argumentatie,
    "",
    "## Financiële gevolgen",
    sections.financieleGevolgen,
    "",
    "## Besluit",
    sections.besluit,
    "",
    "## Bijlagen",
    sections.bijlagen,
  ].join("\n");

  return { markdown: md, sections, articles };
}
