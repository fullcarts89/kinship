// K4 / K8 / K9 acceptance (founder's 13 Oct native pass), through the real screens, the local backend and the
// real ai-gateway, for every reply shape the live model gave in 10 runs plus the hand-written ones. The
// checklist and its invariants are in k4flow.ts.
import { K4, k4Run } from "./k4flow";
import { useReply } from "./localStack";

const SHAPES = [
  "hand: on Anthony", "hand: on Chris", "hand: on no one", "hand: a line each", "legacy: on Sam Eden",
  "live 1 (13 Oct, 1 of the runs)", "live 2 (13 Oct, 3 of the runs)", "live 3 (13 Oct, 1 of the runs)", "live 4 (13 Oct, 1 of the runs)",
  "live 5 (13 Oct, 1 of the runs)", "live 6 (13 Oct, 1 of the runs)", "live 7 (13 Oct, 1 of the runs)", "live 8 (13 Oct, 1 of the runs)",
  "live 9 (13 Oct evening, 1 of 12 runs)",
];

for (const shape of SHAPES) {
  for (const run of ["A", "B"] as const) {
    it(`K4 run ${run} (${shape}): one memory, the right people, no loop, every page agrees, nothing asked again`, async () => {
      await useReply(K4, shape);
      const { asked, card } = await k4Run(run, shape);
      console.log(`K4 run ${run} (${shape}): asked ${JSON.stringify(asked)}; ${card}`);
    });
  }
}
