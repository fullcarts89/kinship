// K20 / K19 / K23 (founder device check, 14 Oct), through the real screens, the local backend and the real
// ai-gateway, with the founder's own People, for every shape the model gives "I need to call John tonight"
// (each live shape captured, and the ones it may give): a promise, a plan, an event; with and without its
// date words; and told again the day after, on an account that already has yesterday's line. The steps
// and their invariants are in k20flow.ts.
import { k20FromToday, k23FromPage } from "./k20flow";

const SHAPES = [
  "live 1 (13 Oct, 3 of the runs)", "hand: promise", "hand: plan", "hand: promise, no date words", "hand: plan, no date words",
  "hand: event", "hand: told again, merged into yesterday's by the model",
  "live 2 (15 Oct, told again the next day: the model merges into yesterday's line; native simulator)",
];
const yesterday = (shape: string) => /told again/u.test(shape);

for (const shape of SHAPES) {
  for (const answer of ["yes", "not_yet"] as const) {
    it(`K20 (${shape}), from Today, ${answer === "yes" ? "Yes" : "Not yet"}: on Today promptly; the return question; ${answer === "yes" ? "done" : "still there"}`, async () => {
      await k20FromToday(shape, answer, { reply: shape, yesterday: yesterday(shape) });
    });
  }
}

for (const shape of ["live 1 (13 Oct, 3 of the runs)", "hand: plan", "hand: told again, merged into yesterday's by the model"]) {
  for (const answer of ["yes", "not_yet"] as const) {
    it(`K23 (${shape}), from John's page, ${answer === "yes" ? "Yes" : "Not yet"}: "Did you reach John?" on his page and on Today`, async () => {
      await k23FromPage(shape, answer, { reply: shape, yesterday: yesterday(shape) });
    });
  }
}
