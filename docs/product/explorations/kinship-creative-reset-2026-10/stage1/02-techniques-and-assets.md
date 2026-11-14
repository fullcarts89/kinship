# Stage 1 · How the screens were made, and where every asset came from

## The process, changed as asked

Art direction first, then high-fidelity composition, then nothing else. There is no prototype in this folder: `compose.html` is a **compositing tool** that layers the raster art, the photographs and the typography at fixed pixel positions for one device size, and `capture.sh` renders it headless at 3× (1179 × 2556). No tokens, no responsive layout, no interaction, no React. Stage 2 is where those return.

## Techniques, by direction

### Direction A · Electric Garden, reinvented

| Technique | What it does on the screen |
|---|---|
| **Original raster botanicals, cut by the page** | The hero bloom was generated as a *corner piece* whose petals and leaves run past the top and right edges of its own canvas, so on the phone it reads as art bigger than the screen, as on the board. Airbrushed two- and three-stop gradients, dark green at the petal roots, visible grain, no outlines |
| **A fluid photo mask** | The person's photo sits in a hand-tuned organic path (Connection Orbit's fluid forms), never a circle or a rounded rectangle. The same shape for everyone; it carries no meaning |
| **Depth by layering** | Order, back to front: dawn wash → bloom → photo → leaf spray → name. The leaves cross the photo's edge and the name's letters; a petal shows behind the mask |
| **Atmosphere, not plants on every screen** | A soft radial wash (orange, pink, lavender, butter) fades into the paper by mid-screen. It is the *kind of day*: a race at dawn. A quiet day would be a cooler, lower wash; the plants would not need to change |
| **Type as a window (no photo)** | Without a photo, the name itself is set at 148 pt and filled with the bloom (`background-clip: text`) with a hairline ink keyline for legibility. The name becomes the picture; nothing says a photo is missing |
| **Poster scale** | Archivo Black at 120 pt for the name, 40 pt for the statement, 11 pt tracked caps for labels: a 12:1 ratio, as on the board. Newsreader italic is kept for what the user said about the person, so the product's one serif signature survives |
| **Grain** | A fractal-noise overlay at 32 % multiply over the whole screen, so paper, art and photo share one surface |
| **Colour** | Deep leaf green is the ink and the button. Lime is the provenance dot. Pink, orange, lavender and butter live only in the art and the section dots |

### Direction B · Living Memories

| Technique | What it does on the screen |
|---|---|
| **Photograph first** | The memory photo is the top 55 % of Today, full-bleed, with a warm soft-light grade and a navy gradient at the bottom edge so cream type holds on it. On the person page, the portrait |
| **The split headline** | The name is set twice in Fraunces Black at 150 pt and clipped at the photograph's bottom edge: cream over the photo, navy over the paper. The paper edge cuts the letters. This is the direction's signature and replaces every torn edge |
| **One tactile mark** | A vector postmark (two rings, text on a path, the date in the centre) in bougainvillea, multiplied over photo, yellow and paper. It appears only for a dated occasion |
| **One hard colour field** | A sunshine-yellow band slides out from under the photo's corner on Today; sky and sunshine fields sit offset behind the two prints on the person page. Hard edges, no tape, no tilt beyond 4° |
| **Editorial captions** | The photo's own caption and source sit on the image, top-left, like a photo credit: "Ben after the half last spring." · YOUR CAPTION · MAY 3. The photo is never captioned by Kinship |
| **The collection** | On the person page, two square prints with their captions and dates: the treasured-collection feeling without a scrapbook's clutter. A third print would scroll |
| **No photo** | The hero becomes the person's own two-colour field (sunset over bougainvillea, cut on a diagonal), the name stays split by the paper edge, and on Today the occasion itself becomes the picture: "Chicago Marathon · Sunday, Oct 11" in cream italic. The postmark turns navy |
| **Paper** | A generated sand paper texture under everything, lightened by 55 %, replaces the dotted grid |
| **Type** | Fraunces (soft, heavy, optical size 144) for names and statements; Instrument Sans for the machine; the user's words in Fraunces italic |

## Where every asset came from

All images were generated for this review through the image-generation connector attached to this workspace, on 19–20 October 2026, from text prompts written for Kinship, with no reference image from the boards or from any third party. The two memory photographs and the cleaned portrait were made from the first portrait as an identity reference, so that "Ben" is one consistent person. Every generation is logged below with its model and job id; the prompts are in the session transcript and can be re-issued.

**No photograph of a real person is in this repository.** "Ben" does not exist. The photographs are synthetic sample imagery standing in for photos a user would choose themselves, and are labelled as such wherever they are shown. They were not derived from anyone's likeness.

| File | What | Model | Job |
|---|---|---|---|
| `assets/a-bloom-corner.png` | Hero bloom, corner piece, transparent | gpt_image_2_5 (high, 2k, transparent) | `e52e0ded-c030-4585-b7a9-7b14d0acd248` |
| `assets/a-bloom-lavender.png` | Lavender and yellow corner piece, transparent | gpt_image_2_5 | `bd10bf4f-d2d0-4a00-a21d-68f73aa98c07` |
| `assets/a-leaves.png` | Leaf spray with berries, transparent | gpt_image_2_5 | `0a765a39-cc44-4fe6-a0ba-3ac6b080fa2f` |
| `assets/a-leaf.png` | Single leaf, transparent | gpt_image_2_5 | `eea87f53-e53c-4e7c-992d-9e70727821c7` |
| `assets/a-bud.png` | Bud and two leaves from the page's bottom edge, transparent | gpt_image_2_5 | `b45096fd-c352-42ba-a1d1-863198893a1b` |
| `assets/a-petal.png` | Petal close-up (generated, unused in the final stills) | gpt_image_2_5 | `7ebe2713-d865-44f4-89c8-7b59663c043c` |
| `assets/photo-ben-lake.jpg` | Portrait: lakefront, golden hour | Higgsfield Soul 2.0, then a logo-removal edit with Nano Banana Pro | `a57ffcb0-b9c2-4a30-873a-c57288c67d9b` → `e37f881c-a673-4de1-8c32-24e50f2ec228` |
| `assets/photo-ben-half.jpg` | Memory photo: after a half marathon, spring | Nano Banana Pro, identity from the portrait, then a logo-removal edit | `f798207c-bfa8-4062-b3a3-eb30fe48921c` → `05cc1a5a-3004-40c2-a457-9f6d5c1db969` |
| `assets/photo-ben-shuffle.jpg` | Memory photo: a March fun-run start | Nano Banana Pro, identity from the portrait | `91173a5d-15d0-40f3-9f7c-6c22e4a003bb` |
| `assets/paper-sand.jpg` | Sand paper texture | gpt_image_2_5 (medium, 1k) | `4a5790c0-4c1b-4395-98a3-242bbe32b3ad` |

Generated and rejected (not in the repository): a first lily (too much like stock clip art), a second portrait (a different face), a café portrait, a set of four abstract leaves (fringed edges), a berry sprig (white halo after background removal).

Vector, drawn by hand in this folder: the postmark, the back chevron, the pencil icon, the status bar, the fluid mask path.

Fonts: Archivo, Fraunces, Instrument Sans, Newsreader, all from Google Fonts under the SIL Open Font License.

Cost: about 30 credits of the workspace's image-generation balance in total; every image cost between 0.25 and 2 credits.

## What was deliberately not done

- No CSS-drawn flowers, leaves, torn paper, washi, stickers or stars.
- No trace, crop or reuse of any element of the four boards.
- No photo of a real person; no inference from a photo; no photo on a sensitive line.
- No prototype, token set, dark mode, dense or sensitive state: Stage 2.
