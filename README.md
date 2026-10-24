# Cube Solver

Photograph your Rubik's cube and solve it step by step, in the browser.

1. **Scan** – take 6 photos (one per side) with the live camera, or upload them. Each photo is checked for blur, lighting, glare and alignment, and you're asked to retake it if needed.
2. **Check** – the detected colours are shown as an unfolded cube. Tap a sticker to fix it. The app checks the cube is solvable, fixes photos taken at the wrong angle automatically, and asks for retakes of sides that were hard to read.
3. **3D** – a rotatable 3D model to compare with your real cube.
4. **Solve** – step by step with animated moves, using either:
   - **Beginner method**: layer by layer in 8 stages (≈ 100–200 moves)
   - **Shortest solution**: Kociemba two-phase algorithm via [cubejs](https://github.com/ldez/cubejs) (≈ 20 moves)

Everything runs in the browser (Next.js static export). Photos never leave the device.

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests (model, validator, both solvers, colour detection)
npm run build      # static site in out/
```

The camera needs HTTPS, except on `localhost`. To test on a phone, use the deployed site.

## Put it online (GitHub Pages)

1. Create an empty repository on GitHub named `cube-solver`. Don't add a README or licence.
2. Push this project:
   ```bash
   git remote add origin https://github.com/<your-username>/cube-solver.git
   git push -u origin main
   ```
3. On GitHub, go to **Settings → Pages**, and set **Source** to **GitHub Actions**.
4. The workflow in `.github/workflows/deploy.yml` builds, tests and publishes on every push to `main`. The site will be at `https://<your-username>.github.io/cube-solver/`.

The base path (`/cube-solver`) is detected automatically. If you rename the repository, nothing needs to change.

## Project layout

| Path | What it does |
| --- | --- |
| `lib/cube/model.ts` | Sticker layout, moves (built from 3D geometry), notation |
| `lib/cube/validate.ts` | Solvability checks, auto-fix for rotated photos |
| `lib/solver/beginner.ts` | Layer-by-layer solver |
| `lib/solver/solver.worker.ts` | Runs both solvers in a Web Worker |
| `lib/vision/quality.ts` | Photo checks and sticker sampling |
| `lib/vision/classify.ts` | Colour assignment (exactly 9 per colour) with confidence |
| `components/` | Scan, review, 3D and solve screens |
