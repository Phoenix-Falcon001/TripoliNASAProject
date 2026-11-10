# Papers to find (K2, K3)

We have **S01** (SAFFIRE: *Results of Large-Scale Spacecraft Flammability Tests*, NTRS 20170008805). We need **at least one FLEX and one BASS-II paper**. Find them on https://ntrs.nasa.gov (free PDFs). Claude could not search NTRS from its environment, so **titles and IDs below are search terms, not confirmed papers**. Check every detail on NTRS before adding it.

## How to choose a paper (in this order)
1. **Full paper** (journal or conference paper, technical memorandum) over slides or abstracts. `source_type` affects the trust badges.
2. **Results with numbers**: flame spread rates, extinction limits, oxygen levels, flow speeds, droplet sizes. These become card values.
3. **Comparison with Earth / normal gravity**: feeds the Earth vs Space page.
4. **Stated open questions** ("further work is needed", "not yet understood"): feeds What NASA doesn't know.
5. **Text-based PDF**: if you can't select the text in the PDF, quotes can't be auto-checked. Skip scanned papers.

## Search terms
| Experiment | What it studied | Try on NTRS |
|---|---|---|
| **FLEX** (Flame Extinguishment Experiment, ISS Combustion Integrated Rack) | Burning fuel droplets in microgravity, extinction, "cool flames", fire-suppressant gases | `FLEX droplet combustion International Space Station` · `FLEX cool flame heptane` · `droplet extinction microgravity suppressant` · authors: **Nayagam**, **Dietrich**, **Williams** |
| **BASS / BASS-II** (Burning and Suppression of Solids, ISS Microgravity Science Glovebox) | Flame spread over solid materials in low-speed flow, oxygen limits, extinction / suppression | `Burning and Suppression of Solids BASS-II` · `BASS-II flame spread low flow microgravity` · authors: **Olson**, **Ferkul**, **Fernandez-Pello** |
| More SAFFIRE (optional, K1) | Large-scale flammability on Cygnus vehicles | `Saffire-II` · `Saffire-IV` / `Saffire-V` · author: **Urban**, **Ruff** |

## Then, for each paper
```bash
# save the PDF as papers/S02.pdf (next free id), then:
python pipeline/add_paper.py papers/S02.pdf S02 --experiment FLEX --type full_paper \
    --title "<exact title from NTRS>" --url "https://ntrs.nasa.gov/citations/<id>" --ntrs <id> --year <year>
python pipeline/draft_cards.py S02
```
Use the experiment name exactly as `SAFFIRE`, `FLEX` or `BASS-II`. Card IDs follow it: SAF-, FLX-, BAS-.
