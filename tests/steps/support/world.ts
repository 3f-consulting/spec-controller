import { setWorldConstructor, World } from "@cucumber/cucumber";
import type { IWorldOptions } from "@cucumber/cucumber";
import type { ErrorObject } from "ajv";

export interface CommandRun {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

export interface ReconciledTarget {
  readonly cwd: string;
  readonly inputs: readonly string[];
}

export interface RowObservation {
  readonly cites: readonly { readonly featureCode: string; readonly number: string }[];
}

export interface RowReconciliation {
  readonly claim: { readonly claimCode?: { readonly featureCode: string; readonly number: string } };
  readonly qualityCheckReconciliations: readonly { readonly observation?: RowObservation }[];
}

// The reports a run writes when each is asked for alone on standard output.
export interface ReportsAlone {
  readonly markdown: string;
  readonly json: string;
}

// The schema's refusal a checked report is expected to draw, by the keyword and the place it names.
export interface ExpectedRefusal {
  readonly keyword: string;
  readonly instancePath: string;
  readonly params: Readonly<Record<string, unknown>>;
}

// Every declared field is an own property holding undefined until a step sets it, so the proxy the
// constructor returns can refuse a read of one this scenario never set. A field left empty on purpose
// holds null.
export class SpecControllerWorld extends World {
  readonly temporaryDirectories: string[] = [];

  run!: CommandRun;

  rowsTarget!: string;
  reconciledTarget!: ReconciledTarget;
  reconciledReport!: unknown;

  checkedReport!: Record<string, unknown>;
  expectedRefusal!: ExpectedRefusal | null;
  schemaErrors!: readonly ErrorObject[];

  reportsAlone!: ReportsAlone;
  destinationScratch!: string;
  destinationFiles!: readonly string[];
  sharedFile!: string;
  sharedBefore!: string;
  namedOutputs!: readonly [string, string];

  removedWorkingDirectory!: string;

  constructor(options: IWorldOptions) {
    super(options);
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (typeof prop === "string" && Object.hasOwn(target, prop) && Reflect.get(target, prop) === undefined) {
          throw new Error(`${prop} was read before this scenario set it`);
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }
}

setWorldConstructor(SpecControllerWorld);
