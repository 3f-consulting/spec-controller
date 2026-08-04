# Rename targets — retired term → what to write instead

PURE DATA. Every term in the left column is a **mention** — the definition of a word this
repository has retired — never a *use*. That is what makes this file's whole-file exemption
from the vocabulary audit honest, by the same test as `blockedVocabulary.md`'s
(@SCN-VOC-016, 3F-2378).

**Why this is not part of the canon table.** `blockedVocabulary.md` is a *vendored copy* of
canon's blocked-vocabulary appendix, and canon states one replacement sentence per row. This
repository's targets are **per-inflection**: one canon row covers `demand` / `demanded` /
`demanding` / `demander`, and each takes a different replacement because the noun, the verb
and the agent noun become different things. Folding them into the vendored table would
either flatten that granularity or add a column canon does not have to a copy of someone
else's document. `blockedVocabulary.ts` records the division: *canon owns which words are
retired, this repository owns what each one becomes.*

**Why this is not in `vocabWordSets.ts`.** It was, and that is what kept a code file on the
audit's exempt list — a mixed file, code with data inlined, whose exemption hid a *use*
behind a *mention*. Relocating the data is what lets that file be seen (3F-2378).

The audit reads this table for the manifest's `new` column. A term with no row still flags —
the ban is derived from the canon table, not from here — it simply names no replacement.

| Retired term | Write instead | Note |
| --- | --- | --- |
| supply | evidence observation | |
| execution | evidence observation | |
| executions | evidence observations | |
| state | outcome | the outcome/verdict rationalisation, locked 2026-07-02 |
| obligation | evidence obligation | bare shortening; approved only inside the full term |
| observation | evidence observation | bare shortening; approved only inside the full term |
| ghost | ghost evidence observation | |
| requirement | evidence obligation | |
| requirements | evidence obligations | |
| oob | out of balance | opaque abbreviation of the verdict value |
| budget | threshold | @SCN-VOC-007. Singular only — the plural resolves through the singulariser stem lookup in `classifyWords`, so a plural row would be a second copy to drift |
| demand | evidence obligation | @SCN-VOC-004. The noun takes the canon term |
| demanded | evidence obligation | @SCN-VOC-004 |
| demanding | naming | @SCN-VOC-004. VERBS take `names` / `naming`, never the retired `declare` |
| demander | naming scenario | @SCN-VOC-004. The agent noun |
| undemanded | no-evidence-obligation | @SCN-VOC-004, 3F-2300. The retired credit-side outcome HANDLE. Its target is the hyphenated handle rather than the prose term, because that is what an occurrence must literally become |
