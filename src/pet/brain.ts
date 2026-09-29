import { addDays } from "../lib/dates";
import { formatMoney } from "../lib/money";
import type { PetContext } from "./context";
import { dayOfMonthIn, hasAny, monthIn, normalize, parseMoney, say, whenIn, words, type Lang } from "./lang";
import type { Mood } from "./PetCat";

/*
 * The cat's "brain": plain rules over the user's own numbers. No AI model and
 * no network. Every figure it says is computed here, so it can't be wrong
 * about the maths; when it doesn't understand, it says so.
 */

export type Insight = { id: string; tone: "alert" | "tip" | "good"; text: string; celebrate?: boolean };

type Fmt = (amount: number) => string;
const pct = (a: number, b: number) => Math.round((a / b) * 100);
/** "1 day" / "5 days"; Tagalog doesn't change. */
const daysIn = (lang: Lang, n: number) => (lang === "tl" ? `${n} araw` : `${n} ${n === 1 ? "day" : "days"}`);

/* ---------- Reminders ---------- */

export function insights(ctx: PetContext, lang: Lang, currency: string): Insight[] {
  const fmt: Fmt = (n) => formatMoney(n, currency);
  const out: Insight[] = [];
  const month = monthIn(lang, ctx.month);
  const nameOf = (id: string) => ctx.categories.find((c) => c.id === id)?.name ?? "";

  if (ctx.expense > 0 && ctx.income === 0) {
    out.push({
      id: "no-income",
      tone: "tip",
      text: say(
        lang,
        `You've logged spending but no money in for ${month}. Add your allowance or salary so I can tell how much is left.`,
        `May naka-log kang gastos pero wala pang pumasok na pera ngayong ${month}. I-add mo ang allowance o sahod mo para malaman ko kung magkano pa ang natitira.`,
      ),
    });
  }

  // Spending pace against what came in.
  const perDay = ctx.day > 0 ? ctx.expense / ctx.day : 0;
  if (ctx.income > 0 && ctx.day >= 3 && perDay > 0) {
    const projected = Math.round(perDay * ctx.daysInMonth);
    if (ctx.balance < 0) {
      out.push({
        id: "over",
        tone: "alert",
        text: say(
          lang,
          `You've spent ${fmt(-ctx.balance)} more than came in this month.`,
          `Lampas na nang ${fmt(-ctx.balance)} ang nagastos mo kaysa sa pumasok na pera ngayong buwan.`,
        ),
      });
    } else if (projected > ctx.income) {
      const runOut = Math.min(ctx.daysInMonth, ctx.day + Math.floor(ctx.balance / perDay));
      out.push({
        id: "pace",
        tone: "alert",
        text: say(
          lang,
          `At this pace you'll spend about ${fmt(projected)} this month, more than the ${fmt(ctx.income)} that came in. Your money may run out around ${dayOfMonthIn(lang, runOut)}.`,
          `Sa ganitong bilis, aabot sa mga ${fmt(projected)} ang gastos mo ngayong buwan, lampas sa ${fmt(ctx.income)} na pumasok. Baka maubos ang pera mo bandang ${dayOfMonthIn(lang, runOut)}.`,
        ),
      });
    } else if (projected <= ctx.income * 0.85 && ctx.day >= 7) {
      out.push({
        id: "on-track",
        tone: "good",
        text: say(
          lang,
          `You're on track. At this pace you'll still have about ${fmt(ctx.income - projected)} left at the end of ${month}.`,
          `Maayos ang takbo mo. Sa ganitong bilis, may matitira pang mga ${fmt(ctx.income - projected)} sa katapusan ng ${month}.`,
        ),
      });
    }
  }

  // Budgets.
  for (const [id, limit] of ctx.budgets) {
    const spent = ctx.spentByCategory.get(id) ?? 0;
    const name = nameOf(id);
    if (!name || spent < limit * 0.8) continue;
    out.push(
      spent > limit
        ? {
            id: `budget-over:${id}`,
            tone: "alert",
            text: say(lang, `${name} is ${fmt(spent - limit)} over its ${fmt(limit)} budget.`, `Lampas na nang ${fmt(spent - limit)} ang ${name} sa budget nitong ${fmt(limit)}.`),
          }
        : {
            id: `budget-near:${id}`,
            tone: "tip",
            text: say(
              lang,
              `${name} is at ${pct(spent, limit)}% of its budget, with ${daysIn(lang, ctx.daysLeft)} to go. ${fmt(limit - spent)} left for it.`,
              `Nasa ${pct(spent, limit)}% na ng budget ang ${name}, at ${ctx.daysLeft} araw pa bago matapos ang buwan. ${fmt(limit - spent)} na lang ang natitira para dito.`,
            ),
          },
    );
  }
  if (ctx.totalBudget && ctx.expense >= ctx.totalBudget * 0.8) {
    const over = ctx.expense > ctx.totalBudget;
    out.push({
      id: over ? "total-over" : "total-near",
      tone: over ? "alert" : "tip",
      text: over
        ? say(lang, `You're ${fmt(ctx.expense - ctx.totalBudget)} over your monthly budget.`, `Lampas ka na nang ${fmt(ctx.expense - ctx.totalBudget)} sa monthly budget mo.`)
        : say(lang, `You've used ${pct(ctx.expense, ctx.totalBudget)}% of your monthly budget.`, `Nagamit mo na ang ${pct(ctx.expense, ctx.totalBudget)}% ng monthly budget mo.`),
    });
  }

  // Categories up on the same point last month.
  if (ctx.lastSamePeriod > 0) {
    const ups = [...ctx.spentByCategory]
      .map(([id, now]) => ({ id, now, then: ctx.lastSamePeriodByCategory.get(id) ?? 0 }))
      .filter((c) => c.then > 0 && c.now > c.then * 1.3 && c.now - c.then > Math.max(ctx.typicalDaily, 1))
      .sort((a, b) => b.now - b.then - (a.now - a.then));
    const top = ups[0];
    if (top) {
      const name = nameOf(top.id);
      out.push({
        id: `up:${top.id}`,
        tone: "tip",
        text: say(
          lang,
          `You've spent ${pct(top.now - top.then, top.then)}% more on ${name} than by this time last month (${fmt(top.now)} vs ${fmt(top.then)}).`,
          `Mas mataas nang ${pct(top.now - top.then, top.then)}% ang gastos mo sa ${name} kumpara sa ganitong araw noong nakaraang buwan (${fmt(top.now)} kontra ${fmt(top.then)}).`,
        ),
      });
    } else if (ctx.day >= 7 && ctx.expense < ctx.lastSamePeriod * 0.8) {
      out.push({
        id: "down",
        tone: "good",
        text: say(
          lang,
          `Nice! You've spent ${pct(ctx.lastSamePeriod - ctx.expense, ctx.lastSamePeriod)}% less than by this time last month.`,
          `Galing! Mas mababa nang ${pct(ctx.lastSamePeriod - ctx.expense, ctx.lastSamePeriod)}% ang gastos mo kumpara sa ganitong araw noong nakaraang buwan.`,
        ),
      });
    }
  }

  if (ctx.typicalDaily > 0 && ctx.todaySpent > ctx.typicalDaily * 3) {
    out.push({
      id: "big-day",
      tone: "tip",
      text: say(
        lang,
        `Big spending day: ${fmt(ctx.todaySpent)} today, about ${Math.round(ctx.todaySpent / ctx.typicalDaily)} times your usual.`,
        `Malaki ang gastos ngayong araw: ${fmt(ctx.todaySpent)}, mga ${Math.round(ctx.todaySpent / ctx.typicalDaily)} beses ng karaniwan mo.`,
      ),
    });
  }

  for (const u of ctx.upcoming) {
    if (u.type === "expense" && u.date <= addDays(ctx.today, 3)) {
      out.push({
        id: `due:${u.id}:${u.date}`,
        tone: "tip",
        text: say(lang, `${u.name} (${fmt(u.amount)}) is due ${whenIn(lang, u.date, ctx.today)}.`, `Due ang ${u.name} (${fmt(u.amount)}) ${whenIn(lang, u.date, ctx.today)}.`),
      });
    }
  }

  for (const g of ctx.goals) {
    if (g.saved >= g.target) {
      out.push({
        id: `goal-done:${g.id}`,
        tone: "good",
        celebrate: true,
        text: say(lang, `You reached your ${g.name} goal! ${fmt(g.saved)} saved.`, `Naabot mo na ang ${g.name} goal mo! ${fmt(g.saved)} ang naipon.`),
      });
    } else if (g.saved >= g.target * 0.8) {
      out.push({
        id: `goal-near:${g.id}`,
        tone: "good",
        text: say(lang, `Only ${fmt(g.target - g.saved)} to go for ${g.name}.`, `${fmt(g.target - g.saved)} na lang para sa ${g.name}.`),
      });
    } else if (g.deadline && g.deadline > ctx.today) {
      const months = Math.max(1, monthsBetween(ctx.today, g.deadline));
      out.push({
        id: `goal-pace:${g.id}`,
        tone: "tip",
        text: say(
          lang,
          `To reach ${g.name} on time, save about ${fmt(Math.ceil((g.target - g.saved) / months))} a month.`,
          `Para maabot ang ${g.name} sa tamang oras, mag-ipon ng mga ${fmt(Math.ceil((g.target - g.saved) / months))} kada buwan.`,
        ),
      });
    }
  }

  if (ctx.carry) {
    out.push({
      id: "carry",
      tone: "tip",
      text: say(
        lang,
        `Last month ended with ${fmt(ctx.carry.amount)} left. You can carry it into ${month} from the Home screen, or put it in a savings goal.`,
        `May natirang ${fmt(ctx.carry.amount)} noong nakaraang buwan. Puwede mo itong ilipat sa ${month} mula sa Home, o ilagay sa savings goal.`,
      ),
    });
  }

  const staleBackup = !ctx.lastBackup || ctx.lastBackup < addDays(ctx.today, -30);
  if (staleBackup && ctx.entries.length >= 20) {
    out.push({
      id: "backup",
      tone: "tip",
      text: say(
        lang,
        "It's been a while since your last backup. Save one in More, Backup & export, so a lost phone doesn't mean lost records.",
        "Matagal na mula noong huli mong backup. Mag-save ka sa More, Backup & export, para hindi mawala ang records mo kung mawala ang phone.",
      ),
    });
  }

  const rank = { alert: 0, tip: 1, good: 2 };
  return out.sort((a, b) => rank[a.tone] - rank[b.tone]);
}

function monthsBetween(a: string, b: string): number {
  const [ay = 0, am = 0] = a.split("-").map(Number);
  const [by = 0, bm = 0] = b.split("-").map(Number);
  return (by - ay) * 12 + (bm - am);
}

/** The cat's face for the current state of things. */
export function moodFor(ctx: PetContext, list: Insight[]): Mood {
  if (ctx.hour >= 23 || ctx.hour < 6) return "sleepy";
  if (list.some((i) => i.celebrate)) return "excited";
  if (list.some((i) => i.tone === "alert")) return "worried";
  if (list.some((i) => i.tone === "good")) return "happy";
  return "okay";
}

/* ---------- Conversation ---------- */

export type Reply = { messages: string[]; mood?: Mood; expectAmount?: boolean };

export const QUICK_QUESTIONS: Record<Lang, string[]> = {
  en: ["Can I afford something?", "How much can I spend a day?", "Where does my money go?", "How am I doing?", "Tips to save"],
  tl: ["Kaya ko bang bumili?", "Magkano pwede kong gastusin kada araw?", "Saan napupunta ang pera ko?", "Kumusta ang lagay ko?", "Paano makatipid?"],
};

export function greeting(ctx: PetContext, list: Insight[], lang: Lang, name: string, currency: string): Reply {
  // Past bedtime it asks why you're up rather than saying "good morning".
  const hi =
    ctx.hour >= 23 || ctx.hour < 6
      ? say(lang, "Still up?", "Gising ka pa?")
      : ctx.hour < 12
        ? say(lang, "Good morning!", "Magandang umaga!")
        : ctx.hour < 18
          ? say(lang, "Good afternoon!", "Magandang hapon!")
          : say(lang, "Good evening!", "Magandang gabi!");
  if (ctx.entries.length === 0) {
    return {
      messages: [
        say(lang, `${hi} I'm ${name}, your budget cat.`, `${hi} Ako si ${name}, ang budget cat mo.`),
        say(
          lang,
          "Add the money you have, like an allowance or salary, then log what you spend. I'll keep an eye on it for you.",
          "I-add mo ang pera mo, gaya ng allowance o sahod, tapos i-log mo ang mga gastos mo. Babantayan ko ang lahat para sa'yo.",
        ),
      ],
    };
  }
  const mood = moodFor(ctx, list);
  const opener = {
    happy: say(lang, "Your money's looking good.", "Maganda ang lagay ng pera mo."),
    excited: say(lang, "Big news!", "May magandang balita!"),
    worried: say(lang, "I'm a little worried about your spending.", "Medyo nag-aalala ako sa gastos mo."),
    sleepy: say(lang, "Here's a quick look before bed.", "Mabilisang silip bago matulog."),
    okay: say(lang, "Here's what I noticed.", "Ito ang napansin ko."),
  }[mood];
  const messages = [`${hi} ${opener}`, ...list.slice(0, 3).map((i) => i.text)];
  if (list.length === 0) messages.push(leftLine(ctx, lang, currency));
  return { messages, mood };
}

type Period = "today" | "week" | "month" | "lastMonth";

const KW = {
  afford: ["afford", "buy", "purchase", "should i get", "can i get", "worth it", "splurge", "bili", "bumili", "bibili", "bilhin", "kaya ko ba", "kaya ko bang", "pwede ba", "puwede ba", "ok lang ba", "okay lang ba", "gastusin ko"],
  spend: ["spent", "spend", "spending", "cost", "gastos", "gumastos", "nagastos", "ginastos", "nagbayad"],
  perDay: ["per day", "a day", "daily", "each day", "every day", "kada araw", "bawat araw", "isang araw", "araw-araw", "per araw"],
  left: ["left", "balance", "remaining", "how much do i have", "how much money", "natitira", "natira", "balanse", "may pera pa", "magkano pa", "pera ko pa"],
  where: ["where", "most", "biggest", "top", "breakdown", "categories", "saan", "napunta", "napupunta", "pinakamalaki", "pinaka"],
  compare: ["last month", "compare", "compared", "vs", "versus", "more than usual", "kumpara", "nakaraang buwan", "noong isang buwan", "last buwan"],
  summary: ["how am i doing", "how's it going", "summary", "overview", "report", "status", "kumusta", "kamusta", "musta", "lagay", "ayos ba"],
  tips: ["tip", "tips", "save", "saving", "cut", "reduce", "advice", "tipid", "makatipid", "magtipid", "ipon", "mag-ipon", "paano"],
  budget: ["budget", "budgets", "limit", "badyet"],
  goals: ["goal", "goals", "saving for", "target", "ipon para", "layunin"],
  due: ["due", "bill", "bills", "upcoming", "coming up", "bayarin", "babayaran", "due date", "sahod", "payday"],
  greet: ["hi", "hello", "hey", "yo", "good morning", "good evening", "magandang umaga", "magandang hapon", "magandang gabi", "musta"],
  thanks: ["thanks", "thank you", "thank", "ty", "salamat", "salamuch"],
  who: ["who are you", "your name", "what are you", "sino ka", "pangalan mo", "ano ka"],
  help: ["help", "what can you do", "what can i ask", "tulong", "ano kaya mo", "ano pwede itanong"],
};

// Everyday words for the built-in categories, in English and Tagalog.
const CATEGORY_WORDS: Record<string, string[]> = {
  "food-drink": ["food", "eat", "eating", "lunch", "dinner", "breakfast", "snack", "snacks", "coffee", "grocery", "groceries", "milk tea", "restaurant", "jollibee", "mcdo", "pagkain", "kain", "kumain", "ulam", "merienda", "meryenda", "almusal", "tanghalian", "hapunan", "kape", "hapunan"],
  gas: ["gas", "fuel", "gasolina", "diesel", "petrol", "parking", "toll", "gasoline"],
  shopping: ["shopping", "shoes", "sapatos", "clothes", "damit", "bag", "phone", "cellphone", "gadget", "laptop", "shopee", "lazada", "tsinelas", "relo", "watch"],
  "self-care": ["haircut", "gupit", "salon", "skincare", "gym", "spa", "massage", "masahe", "medicine", "gamot", "self care", "selfcare"],
  loan: ["loan", "utang", "hulog", "installment", "credit card"],
};

/** Whole-word (or whole-phrase) match, so "gas" doesn't match inside "gastusin". */
function containsPhrase(text: string, phrase: string): boolean {
  const p = normalize(phrase).replace(/[^a-z0-9 ]+/g, " ").trim();
  if (!p) return false;
  const t = ` ${normalize(text).replace(/[^a-z0-9 ]+/g, " ")} `.replace(/\s+/g, " ");
  return t.includes(` ${p} `);
}

function findCategory(ctx: PetContext, text: string): string | null {
  const ws = words(text);
  // The user's own category names first (including ones they created), then quick notes, then everyday words.
  for (const c of ctx.categories) {
    if (c.kind !== "expense" || c.system) continue;
    const name = normalize(c.name);
    if (containsPhrase(text, name) || name.split(/[^a-z0-9]+/).some((p) => p.length >= 4 && ws.includes(p))) return c.id;
  }
  for (const c of ctx.categories) {
    if (c.kind !== "expense" || c.system) continue;
    if ((c.quickNotes ?? []).some((q) => q.length >= 3 && containsPhrase(text, q))) return c.id;
  }
  for (const [id, list] of Object.entries(CATEGORY_WORDS)) {
    if (ctx.categories.some((c) => c.id === id) && hasAny(text, list)) return id;
  }
  return null;
}

function findPeriod(text: string): Period {
  if (hasAny(text, ["today", "ngayong araw", "ngayon araw", "kanina"])) return "today";
  if (hasAny(text, ["this week", "week", "ngayong linggo", "linggo"])) return "week";
  if (hasAny(text, ["last month", "nakaraang buwan", "noong isang buwan", "last buwan"])) return "lastMonth";
  return "month";
}

function leftLine(ctx: PetContext, lang: Lang, currency: string): string {
  const fmt: Fmt = (n) => formatMoney(n, currency);
  const month = monthIn(lang, ctx.month);
  return ctx.balance >= 0
    ? say(
        lang,
        `You have ${fmt(ctx.balance)} left in ${month}: ${fmt(ctx.income)} came in and ${fmt(ctx.expense)} went out.`,
        `May ${fmt(ctx.balance)} ka pang natitira ngayong ${month}: ${fmt(ctx.income)} ang pumasok at ${fmt(ctx.expense)} ang nagastos.`,
      )
    : say(
        lang,
        `You're ${fmt(-ctx.balance)} over in ${month}: ${fmt(ctx.income)} came in and ${fmt(ctx.expense)} went out.`,
        `Lampas ka na nang ${fmt(-ctx.balance)} ngayong ${month}: ${fmt(ctx.income)} ang pumasok at ${fmt(ctx.expense)} ang nagastos.`,
      );
}

// Words of an "afford" question that don't say what the item is.
const ASK_FILLER = new Set(
  "i can could should would a an the it this that something anything thing to buy afford get purchase me my ba bang ko ako kaya pwede puwede pede bumili bibili bilhin bili ng na kahit ano bagay ok okay lang".split(" "),
);

/**
 * Answers a message. `expectingAmount` is set when the cat just asked
 * "how much is it?", so a bare amount is read as the price.
 */
export function answer(text: string, ctx: PetContext, list: Insight[], lang: Lang, name: string, currency: string, expectingAmount: boolean): Reply {
  const fmt: Fmt = (n) => formatMoney(n, currency);
  const amount = parseMoney(text, expectingAmount);
  const category = findCategory(ctx, text);
  const month = monthIn(lang, ctx.month);
  const nameOf = (id: string) => ctx.categories.find((c) => c.id === id)?.name ?? "";

  // Just punctuation or emoji.
  if (!/[\p{L}\p{N}]/u.test(text)) {
    return { messages: [say(lang, "Meow? Ask me anything about your money.", "Meow? Magtanong ka tungkol sa pera mo.")], expectAmount: expectingAmount };
  }

  // "Can I afford ...?" with a price (or a price right after the cat asked for one).
  if ((amount !== null && (expectingAmount || hasAny(text, KW.afford))) || (amount !== null && !hasAny(text, KW.spend) && !category)) {
    return afford(ctx, amount!, category, lang, currency);
  }
  if (hasAny(text, KW.afford) && amount === null) {
    // Already out of money: the answer is the same whatever the price.
    if (ctx.income > 0 && ctx.balance <= 0) return afford(ctx, null, category, lang, currency);
    // "Can I afford something?" asks what it is; "can I buy new shoes?" only needs the price.
    const vague = words(text).every((w) => ASK_FILLER.has(w));
    return {
      messages: [
        vague
          ? say(lang, "Sure! What is it, and how much?", "Sige! Ano 'yon, at magkano?")
          : say(lang, "How much is it? Just the amount is fine, like 2500 or 2.5k.", "Magkano 'yan? Kahit amount lang, gaya ng 2500 o 2.5k."),
      ],
      expectAmount: true,
    };
  }
  if (expectingAmount && amount === null && !hasAny(text, [...KW.perDay, ...KW.left, ...KW.where, ...KW.tips])) {
    return { messages: [say(lang, "How much is it? Just the amount is fine, like 2500 or 2.5k.", "Magkano? Kahit amount lang, gaya ng 2500 o 2.5k.")], expectAmount: true };
  }

  // Spending in one category over a period.
  if (category && (hasAny(text, KW.spend) || hasAny(text, ["how much", "magkano"]))) {
    return categorySpend(ctx, category, findPeriod(text), lang, currency);
  }

  if (hasAny(text, KW.perDay)) {
    if (ctx.income === 0) return { messages: [noIncome(lang)] };
    if (ctx.balance <= 0) {
      return {
        messages: [
          redLine(ctx, lang, currency),
          say(
            lang,
            "So there's nothing left to spend per day. Try to hold off on anything that can wait until money comes in.",
            "Kaya wala nang puwedeng gastusin kada araw. Iwasan muna ang gastos na puwedeng ipagpaliban hanggang may pumasok na pera.",
          ),
        ],
        mood: "worried",
      };
    }
    const perDay = Math.floor(ctx.balance / ctx.daysLeft);
    const lines = [
      say(
        lang,
        `To make it to the end of ${month}, you can spend about ${fmt(perDay)} a day for the next ${daysIn(lang, ctx.daysLeft)}.`,
        `Para umabot hanggang katapusan ng ${month}, puwede kang gumastos ng mga ${fmt(perDay)} kada araw sa susunod na ${ctx.daysLeft} araw.`,
      ),
    ];
    if (ctx.typicalDaily > 0) {
      lines.push(
        perDay >= ctx.typicalDaily
          ? say(lang, `That's more than your usual ${fmt(ctx.typicalDaily)} a day, so you're fine.`, `Mas mataas 'yan sa karaniwan mong ${fmt(ctx.typicalDaily)} kada araw, kaya okay ka.`)
          : say(lang, `That's less than your usual ${fmt(ctx.typicalDaily)} a day, so go easy.`, `Mas mababa 'yan sa karaniwan mong ${fmt(ctx.typicalDaily)} kada araw, kaya dahan-dahan muna.`),
      );
    }
    return { messages: lines, mood: perDay >= ctx.typicalDaily ? "happy" : "worried" };
  }

  if (hasAny(text, KW.compare)) return compare(ctx, lang, currency);

  if (hasAny(text, KW.where)) {
    const top = [...ctx.spentByCategory].sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (top.length === 0) return { messages: [say(lang, "You haven't spent anything this month yet.", "Wala ka pang nagastos ngayong buwan.")] };
    const list = top.map(([id, v]) => `${nameOf(id)} ${fmt(v)} (${pct(v, ctx.expense)}%)`).join(", ");
    return {
      messages: [say(lang, `Most of your money this month went to: ${list}.`, `Dito napunta ang karamihan ng pera mo ngayong buwan: ${list}.`)],
    };
  }

  if (hasAny(text, KW.due)) {
    if (ctx.upcoming.length === 0) {
      return { messages: [say(lang, "Nothing repeating is due in the next 7 days.", "Walang paulit-ulit na bayarin o pasok na pera sa susunod na 7 araw.")] };
    }
    return {
      messages: ctx.upcoming.map((u) =>
        u.type === "expense"
          ? say(lang, `${u.name}: ${fmt(u.amount)} due ${whenIn(lang, u.date, ctx.today)}.`, `${u.name}: ${fmt(u.amount)}, due ${whenIn(lang, u.date, ctx.today)}.`)
          : say(lang, `${u.name}: ${fmt(u.amount)} coming in ${whenIn(lang, u.date, ctx.today)}.`, `${u.name}: ${fmt(u.amount)} na darating ${whenIn(lang, u.date, ctx.today)}.`),
      ),
    };
  }

  if (hasAny(text, KW.goals)) return goals(ctx, lang, currency);
  if (hasAny(text, KW.budget)) return budgets(ctx, lang, currency, nameOf);
  if (hasAny(text, KW.tips)) return tips(ctx, lang, currency, nameOf);
  if (hasAny(text, KW.left)) return { messages: [leftLine(ctx, lang, currency)], mood: ctx.balance < 0 ? "worried" : undefined };
  if (hasAny(text, KW.summary)) {
    return { messages: [leftLine(ctx, lang, currency), ...list.slice(0, 2).map((i) => i.text)], mood: moodFor(ctx, list) };
  }
  if (hasAny(text, KW.thanks)) return { messages: [say(lang, "Anytime! Meow.", "Walang anuman! Meow.")], mood: "happy" };
  if (hasAny(text, KW.who)) {
    return {
      messages: [
        say(
          lang,
          `I'm ${name}, your budget cat. I read your entries on this device to help you keep an eye on your money. I don't send your data anywhere.`,
          `Ako si ${name}, ang budget cat mo. Binabasa ko ang mga entry mo sa device na ito para matulungan kang bantayan ang pera mo. Hindi ko ipinapadala ang data mo kahit saan.`,
        ),
      ],
      mood: "happy",
    };
  }
  if (hasAny(text, KW.greet)) {
    return {
      messages: [
        say(
          lang,
          `Hi! Ask me about your money, like "Can I afford a ${fmt(500_000)} dinner?"`,
          `Hello! Magtanong ka tungkol sa pera mo, halimbawa "Kaya ko bang bumili ng ${fmt(500_000)} na hapunan?"`,
        ),
      ],
      mood: "happy",
    };
  }

  return {
    messages: [
      hasAny(text, KW.help)
        ? say(lang, "Here's what I can help with. Tap one or ask in your own words:", "Ito ang mga kaya kong sagutin. I-tap ang isa o magtanong gamit ang sarili mong salita:")
        : say(
            lang,
            "I'm a simple cat, so I only know your money numbers. Try asking one of these:",
            "Simpleng pusa lang ako, kaya pera mo lang ang alam ko. Subukan mong itanong ang isa sa mga ito:",
          ),
    ],
  };
}

function noIncome(lang: Lang) {
  return say(
    lang,
    "I can't tell yet, because no money in is logged this month. Add your allowance or salary first, then ask me again.",
    "Hindi ko pa masabi kasi wala pang naka-log na pumasok na pera ngayong buwan. I-add mo muna ang allowance o sahod mo, tapos tanungin mo ulit ako.",
  );
}

/** "You're already ₱X in the negative…" / "You've used everything…" for a balance at or below zero. */
function redLine(ctx: PetContext, lang: Lang, currency: string): string {
  const fmt: Fmt = (n) => formatMoney(n, currency);
  const month = monthIn(lang, ctx.month);
  return ctx.balance < 0
    ? say(
        lang,
        `You're already ${fmt(-ctx.balance)} in the negative for ${month}: ${fmt(ctx.expense)} went out but only ${fmt(ctx.income)} came in.`,
        `Negative ka na nang ${fmt(-ctx.balance)} ngayong ${month}: ${fmt(ctx.expense)} ang nagastos pero ${fmt(ctx.income)} lang ang pumasok.`,
      )
    : say(lang, `You've already used everything that came in for ${month}.`, `Nagamit mo na ang lahat ng pumasok na pera ngayong ${month}.`);
}

/** What to do instead of buying now: wait for money coming in, dip into savings, or hold off. */
function alternative(ctx: PetContext, price: number | null, lang: Lang, currency: string): string {
  const fmt: Fmt = (n) => formatMoney(n, currency);
  const income = ctx.upcoming.find((u) => u.type === "income");
  const goal = ctx.goals.find((g) => (price === null ? g.saved > 0 : g.saved >= price));
  if (income) {
    return say(
      lang,
      `Your ${income.name} (${fmt(income.amount)}) comes ${whenIn(lang, income.date, ctx.today)}. Waiting until then is safer.`,
      `Darating ang ${income.name} mo (${fmt(income.amount)}) ${whenIn(lang, income.date, ctx.today)}. Mas safe kung hintayin mo muna 'yon.`,
    );
  }
  if (goal) {
    return say(
      lang,
      `You have ${fmt(goal.saved)} in your ${goal.name} savings, but using it would set that goal back.`,
      `May ${fmt(goal.saved)} ka sa ${goal.name} savings mo, pero maaantala ang goal na 'yon kapag ginamit mo.`,
    );
  }
  if (ctx.balance <= 0) {
    return say(
      lang,
      "Anything extra now eats into next month's money, so hold off unless you really need it.",
      "Ang anumang dagdag na gastos ngayon ay babawas sa pera mo sa susunod na buwan, kaya iwasan muna maliban kung talagang kailangan.",
    );
  }
  return say(
    lang,
    "If it can wait, next month or a cheaper option would be easier on your budget.",
    "Kung puwedeng ipagpaliban, mas magaan sa budget kung sa susunod na buwan o mas murang option.",
  );
}

/** "Can I afford it?" `price` is null when the balance is already at or below zero and the price doesn't matter. */
function afford(ctx: PetContext, price: number | null, category: string | null, lang: Lang, currency: string): Reply {
  const fmt: Fmt = (n) => formatMoney(n, currency);
  const month = monthIn(lang, ctx.month);
  if (ctx.income === 0) return { messages: [noIncome(lang)] };

  if (ctx.balance <= 0) {
    const lines = [say(lang, "I'd wait on this one.", "Hintayin mo muna 'to."), redLine(ctx, lang, currency)];
    if (price !== null) {
      lines.push(say(lang, `Buying it would take you to ${fmt(price - ctx.balance)} in the negative.`, `Kapag binili mo 'yan, magiging negative ka nang ${fmt(price - ctx.balance)}.`));
    }
    lines.push(alternative(ctx, price, lang, currency));
    return { messages: lines, mood: "worried" };
  }
  if (price === null) return { messages: [say(lang, "How much is it?", "Magkano 'yan?")], expectAmount: true };

  const after = ctx.balance - price;
  const perDay = Math.floor(after / ctx.daysLeft);
  // Going over a budget makes it "tight" even when there's money for it.
  const categoryLimit = category ? ctx.budgets.get(category) : undefined;
  const breaksBudget =
    (categoryLimit !== undefined && (ctx.spentByCategory.get(category!) ?? 0) + price > categoryLimit) ||
    (ctx.totalBudget !== null && ctx.expense + price > ctx.totalBudget);
  const verdict: "ok" | "tight" | "wait" =
    after < 0 ? "wait" : breaksBudget || (ctx.typicalDaily > 0 && perDay < ctx.typicalDaily * 0.75) ? "tight" : "ok";
  const lines: string[] = [
    {
      ok: say(lang, "Looks okay!", "Mukhang okay!"),
      tight: say(lang, "It's doable, but tight.", "Kaya, pero medyo sikip."),
      wait: say(lang, "I'd wait on this one.", "Hintayin mo muna 'to."),
    }[verdict],
  ];

  if (after < 0) {
    lines.push(
      say(
        lang,
        `It's ${fmt(-after)} more than you have left this month (${fmt(ctx.balance)}).`,
        `Lampas 'yan nang ${fmt(-after)} sa natitira mong pera ngayong buwan (${fmt(ctx.balance)}).`,
      ),
    );
  } else {
    lines.push(
      say(
        lang,
        `You'd have ${fmt(after)} left for the rest of ${month} (${daysIn(lang, ctx.daysLeft)}), about ${fmt(perDay)} a day.`,
        `Matitira sa'yo ang ${fmt(after)} para sa natitirang ${ctx.daysLeft} araw ng ${month}, mga ${fmt(perDay)} kada araw.`,
      ),
    );
    if (ctx.typicalDaily > 0) {
      lines.push(say(lang, `You usually spend about ${fmt(ctx.typicalDaily)} a day.`, `Karaniwan kang gumagastos ng mga ${fmt(ctx.typicalDaily)} kada araw.`));
    }
  }

  // Budget impact, for the category and for the month.
  if (category) {
    const limit = ctx.budgets.get(category);
    const cname = ctx.categories.find((c) => c.id === category)?.name ?? "";
    if (limit) {
      const total = (ctx.spentByCategory.get(category) ?? 0) + price;
      lines.push(
        total > limit
          ? say(lang, `It would put ${cname} at ${fmt(total)}, ${fmt(total - limit)} over its ${fmt(limit)} budget.`, `Aabot ang ${cname} sa ${fmt(total)}, lampas nang ${fmt(total - limit)} sa budget nitong ${fmt(limit)}.`)
          : say(lang, `It would put ${cname} at ${fmt(total)} of its ${fmt(limit)} budget.`, `Aabot ang ${cname} sa ${fmt(total)} mula sa budget nitong ${fmt(limit)}.`),
      );
    }
  }
  if (ctx.totalBudget && ctx.expense + price > ctx.totalBudget) {
    lines.push(say(lang, `It would also take you past your ${fmt(ctx.totalBudget)} monthly budget.`, `Lalampas ka rin sa ${fmt(ctx.totalBudget)} na monthly budget mo.`));
  }

  if (verdict !== "ok") {
    lines.push(alternative(ctx, price, lang, currency));
  } else {
    lines.push(say(lang, "Go for it, and log it after so I can keep track.", "Go lang! I-log mo lang pagkatapos para ma-track ko."));
  }

  return { messages: lines, mood: verdict === "ok" ? "happy" : "worried" };
}

function categorySpend(ctx: PetContext, id: string, period: Period, lang: Lang, currency: string): Reply {
  const fmt: Fmt = (n) => formatMoney(n, currency);
  const cname = ctx.categories.find((c) => c.id === id)?.name ?? "";
  const prevMonth = (() => {
    const [y = 0, m = 1] = ctx.month.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();
  const inPeriod = ctx.entries.filter((t) => {
    if (t.type !== "expense" || t.categoryId !== id) return false;
    if (period === "today") return t.date === ctx.today;
    if (period === "week") return t.date >= ctx.weekStart && t.date <= ctx.today;
    if (period === "lastMonth") return t.date.startsWith(prevMonth);
    return t.date.startsWith(ctx.month);
  });
  const total = inPeriod.reduce((s, t) => s + t.amount, 0);
  const phrase = {
    today: say(lang, "today", "ngayong araw"),
    week: say(lang, "this week", "ngayong linggo"),
    month: say(lang, "this month", "ngayong buwan"),
    lastMonth: say(lang, "last month", "noong nakaraang buwan"),
  }[period];
  const count = inPeriod.length;
  const lines = [
    total === 0
      ? say(lang, `You haven't spent anything on ${cname} ${phrase}.`, `Wala kang nagastos sa ${cname} ${phrase}.`)
      : say(
          lang,
          `You spent ${fmt(total)} on ${cname} ${phrase} (${count} ${count === 1 ? "entry" : "entries"}).`,
          `Nakagastos ka ng ${fmt(total)} sa ${cname} ${phrase} (${count} na entry).`,
        ),
  ];
  const limit = ctx.budgets.get(id);
  if (limit && period === "month" && total > 0) {
    lines.push(say(lang, `That's ${pct(total, limit)}% of its ${fmt(limit)} budget.`, `${pct(total, limit)}% na 'yan ng budget nitong ${fmt(limit)}.`));
  }
  return { messages: lines };
}

function compare(ctx: PetContext, lang: Lang, currency: string): Reply {
  const fmt: Fmt = (n) => formatMoney(n, currency);
  if (ctx.lastSamePeriod === 0) {
    return { messages: [say(lang, "I don't have last month's spending to compare with yet.", "Wala pa akong gastos ng nakaraang buwan para ikumpara.")] };
  }
  const diff = ctx.expense - ctx.lastSamePeriod;
  const p = pct(Math.abs(diff), ctx.lastSamePeriod);
  const lines = [
    say(
      lang,
      `So far this month you've spent ${fmt(ctx.expense)}. By this day last month it was ${fmt(ctx.lastSamePeriod)}, so you're spending ${p}% ${diff >= 0 ? "more" : "less"}.`,
      `Sa ngayon, ${fmt(ctx.expense)} na ang nagastos mo ngayong buwan. Noong ganitong araw noong nakaraang buwan, ${fmt(ctx.lastSamePeriod)}, kaya mas ${diff >= 0 ? "mataas" : "mababa"} nang ${p}% ang gastos mo.`,
    ),
  ];
  return { messages: lines, mood: diff > 0 ? "worried" : "happy" };
}

function goals(ctx: PetContext, lang: Lang, currency: string): Reply {
  const fmt: Fmt = (n) => formatMoney(n, currency);
  if (ctx.goals.length === 0) {
    return {
      messages: [
        say(
          lang,
          "No savings goals yet. You can start one in More, Savings goals. Money with a name is easier to keep.",
          "Wala ka pang savings goal. Puwede kang magsimula sa More, Savings goals. Mas madaling ipunin ang perang may pangalan.",
        ),
      ],
    };
  }
  return {
    messages: ctx.goals.map((g) => {
      const base = say(lang, `${g.name}: ${fmt(g.saved)} of ${fmt(g.target)} (${pct(g.saved, g.target)}%).`, `${g.name}: ${fmt(g.saved)} mula sa ${fmt(g.target)} (${pct(g.saved, g.target)}%).`);
      if (g.saved >= g.target) return base + say(lang, " Done!", " Tapos na!");
      if (g.deadline && g.deadline > ctx.today) {
        const per = Math.ceil((g.target - g.saved) / Math.max(1, monthsBetween(ctx.today, g.deadline)));
        return base + say(lang, ` Save about ${fmt(per)} a month to make it.`, ` Mag-ipon ng mga ${fmt(per)} kada buwan para umabot.`);
      }
      return base;
    }),
  };
}

function budgets(ctx: PetContext, lang: Lang, currency: string, nameOf: (id: string) => string): Reply {
  const fmt: Fmt = (n) => formatMoney(n, currency);
  const lines = [...ctx.budgets].map(([id, limit]) => {
    const spent = ctx.spentByCategory.get(id) ?? 0;
    return say(lang, `${nameOf(id)}: ${fmt(spent)} of ${fmt(limit)} (${pct(spent, limit)}%)`, `${nameOf(id)}: ${fmt(spent)} mula sa ${fmt(limit)} (${pct(spent, limit)}%)`);
  });
  if (ctx.totalBudget) {
    lines.unshift(say(lang, `Whole month: ${fmt(ctx.expense)} of ${fmt(ctx.totalBudget)}`, `Buong buwan: ${fmt(ctx.expense)} mula sa ${fmt(ctx.totalBudget)}`));
  }
  if (lines.length === 0) {
    return {
      messages: [
        say(
          lang,
          "You haven't set any budgets yet. Set one on the Budgets tab and I'll warn you when you get close.",
          "Wala ka pang naka-set na budget. Mag-set ka sa Budgets tab at sasabihan kita kapag malapit ka na.",
        ),
      ],
    };
  }
  return { messages: lines };
}

function tips(ctx: PetContext, lang: Lang, currency: string, nameOf: (id: string) => string): Reply {
  const fmt: Fmt = (n) => formatMoney(n, currency);
  const lines: string[] = [];
  const top = [...ctx.spentByCategory].sort((a, b) => b[1] - a[1])[0];
  if (top) {
    const [id, v] = top;
    lines.push(
      ctx.budgets.has(id)
        ? say(lang, `Keep an eye on ${nameOf(id)}: it's your biggest spend at ${fmt(v)}.`, `Bantayan mo ang ${nameOf(id)}: ito ang pinakamalaki mong gastos, ${fmt(v)}.`)
        : say(
            lang,
            `Your biggest spend is ${nameOf(id)} (${fmt(v)}). A monthly budget for it helps you notice sooner.`,
            `Pinakamalaki mong gastos ang ${nameOf(id)} (${fmt(v)}). Makakatulong ang monthly budget para dito para mapansin mo agad.`,
          ),
    );
  }
  // Lots of small buys in one category.
  const counts = new Map<string, number>();
  for (const t of ctx.entries) if (t.type === "expense" && t.date.startsWith(ctx.month)) counts.set(t.categoryId, (counts.get(t.categoryId) ?? 0) + 1);
  const frequent = [...counts].filter(([, n]) => n >= 8).sort((a, b) => b[1] - a[1])[0];
  if (frequent) {
    const [id, n] = frequent;
    lines.push(
      say(
        lang,
        `You logged ${n} ${nameOf(id)} entries this month. Small buys add up: ${fmt(ctx.spentByCategory.get(id) ?? 0)} in total.`,
        `${n} beses kang gumastos sa ${nameOf(id)} ngayong buwan. Nag-a-add up ang maliliit na gastos: ${fmt(ctx.spentByCategory.get(id) ?? 0)} lahat.`,
      ),
    );
  }
  if (ctx.recurringMonthly > 0) {
    lines.push(
      say(
        lang,
        `Your repeating expenses add up to about ${fmt(ctx.recurringMonthly)} a month. Check if there's one you no longer use.`,
        `Umaabot sa mga ${fmt(ctx.recurringMonthly)} kada buwan ang mga paulit-ulit mong gastos. Tingnan mo kung may hindi mo na ginagamit.`,
      ),
    );
  }
  if (ctx.goals.length === 0) {
    lines.push(
      say(
        lang,
        "Start a savings goal, even a small one, and add to it when money comes in, before you spend.",
        "Magsimula ng savings goal, kahit maliit, at hulugan ito pagpasok ng pera, bago ka gumastos.",
      ),
    );
  }
  lines.push(
    say(
      lang,
      "Try the 24-hour rule: wait a day before buying anything you don't need that costs more than your usual daily spend.",
      "Subukan ang 24-hour rule: maghintay ng isang araw bago bumili ng hindi kailangan na mas mahal sa karaniwan mong gastos kada araw.",
    ),
  );
  return { messages: lines.slice(0, 4) };
}
