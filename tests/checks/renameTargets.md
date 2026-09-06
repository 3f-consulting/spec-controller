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

## Rename targets

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
| declare | names | @SCN-VOC-003, 3F-2329. The VERB: a scenario NAMES an obligation, never "declares" it |
| declared | named | @SCN-VOC-003. The past participle. Its OTHER sense — the retired kind-label, where the whole pair collapses to the bare `scenario` — is a phrase, and a per-word target cannot express a phrase collapse; that is what the subsumed adjacency arm was for |
| declares | names | @SCN-VOC-003 |
| declaring | naming | @SCN-VOC-003. The present participle takes a verb, as `demanding` does |
| declaration | evidence obligation | @SCN-VOC-003. The nominalisation names the debit itself. Singular only — the plural resolves through the singulariser stem lookup, so a plural row would be a second copy to drift |
| declarer | naming scenario | @SCN-VOC-003. The agent noun, the `demander` shape |

**The retired NEGATIVE is deliberately absent from the table above** (@SCN-VOC-003, 3F-2329).
Its verdict is **by-meaning**, so it names no replacement — the shape `unattributed` already
has, and an ABSENT row is how that shape is written here rather than a row with an empty cell
(an empty cell parses to `""`, which reports as a rename to nothing rather than as no target
at all). The word split across the three axes it negated — a `phantom scenario`, a missing
`evidence obligation`, an `uncited static check` — and a single target would be wrong at two
of them. The ban itself is unaffected: it derives from the canon table, and a term with no
row here still flags, it simply names no replacement.


## Grammar qualifiers

**The @SCN-VOC-018 homographs.** A few retired terms are also *grammar this repository does
not own* — a language keyword, a tool's config key. Both senses are really in the tree, so
neither a blanket ban nor a blanket pass is honest: the ban reds code that cannot be written
any other way, the pass greens the retired word everywhere it *is* vocabulary. The
discriminator is **position**, and this table is the ruling record for it.

**Why here and not in `blockedVocabulary.md`.** That file is a vendored copy of canon, and
canon has no qualifier column — the same reason the per-inflection rename targets live here.
*Canon owns which words are retired; this repository owns how each one matches.*

**Directional on purpose.** Grammar must **earn** its pass. Reading grammar as vocabulary
reds honest code and someone fixes it that morning; reading vocabulary as grammar greens a
retired word forever and nothing ever says so. So a term is vocabulary unless its qualifier
is satisfied, and only the exact spelling in the first column can be grammar at all — an
inflection of it (`declares`, `declarations`) is always vocabulary, which is what stops the
reserved-word stem lookup greening the whole family.

`follows` — the qualifier must be the **next** word (`declare const`).
`co-occurs` — the qualifier must appear **anywhere** in the judged sequence, which for a
config key means its key path (`compilerOptions.declaration`).

| Retired term | Match | Qualifier words |
| --- | --- | --- |
| declare | follows | const, function, class, module, namespace, enum, type, let, var, global, abstract, interface |
| declaration | co-occurs | compiler |
