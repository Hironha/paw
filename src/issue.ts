import type { StandardSchemaV1 } from "./standard-schema";

export type PawIssue =
  | PawRequiredIssue
  | PawStringIssue
  | PawNumberIssue
  | PawBooleanIssue
  | PawArrayTypeIssue
  | PawArraySchemaIssue
  | PawObjectTypeIssue
  | PawObjectSchemaIssue
  | PawLiteralIssue
  | PawUnionIssue;

export class PawParseError extends Error {
  public readonly issue: PawIssue;

  constructor(issue: PawIssue) {
    super(issue.message);
    this.issue = issue;
  }
}

export type PawIssuePath = ReadonlyArray<PropertyKey>;

abstract class PawIssueBase implements StandardSchemaV1.Issue {
  public readonly message: string;
  public readonly path?: PawIssuePath;

  constructor(message: string, path?: PawIssuePath) {
    this.message = message;
    this.path = path;
  }
}

const REQUIRED = "required" as const;
export class PawRequiredIssue extends PawIssueBase {
  public readonly kind = REQUIRED;

  constructor(message: string, path?: PawIssuePath) {
    super(message, path);
  }
}

const STRING = "string" as const;
export class PawStringIssue extends PawIssueBase {
  public readonly kind = STRING;

  constructor(message: string, path?: PawIssuePath) {
    super(message, path);
  }
}

const NUMBER = "number" as const;
export class PawNumberIssue extends PawIssueBase {
  public readonly kind = NUMBER;

  constructor(message: string, path?: PawIssuePath) {
    super(message, path);
  }
}

const BOOLEAN = "boolean" as const;
export class PawBooleanIssue extends PawIssueBase {
  public readonly kind = BOOLEAN;

  constructor(message: string, path?: PawIssuePath) {
    super(message, path);
  }
}

const ARRAY = "array-type" as const;
export class PawArrayTypeIssue extends PawIssueBase {
  public readonly kind = ARRAY;

  constructor(message: string, path?: PawIssuePath) {
    super(message, path);
  }
}

export type PawArrayIndexIssue = {
  idx: number;
  issue: PawIssue;
};

const ARRAY_SCHEMA = "array-schema";
export class PawArraySchemaIssue extends PawIssueBase {
  public readonly kind = ARRAY_SCHEMA;
  public readonly issues: PawArrayIndexIssue[];

  constructor(message: string, issues: PawArrayIndexIssue[], path?: PawIssuePath) {
    super(message, path);
    this.issues = issues;
  }
}

const OBJECT_TYPE = "object-type";
export class PawObjectTypeIssue extends PawIssueBase {
  public readonly kind = OBJECT_TYPE;

  constructor(message: string, path?: PawIssuePath) {
    super(message, path);
  }
}

export type PawObjectFieldIssue = {
  readonly field: string;
  readonly issue: PawIssue;
};

const OBJECT_SCHEMA = "object-schema" as const;
export class PawObjectSchemaIssue extends PawIssueBase {
  public readonly kind = OBJECT_SCHEMA;
  public readonly issues: PawObjectFieldIssue[];

  constructor(message: string, issues: PawObjectFieldIssue[], path?: PawIssuePath) {
    super(message, path);
    this.issues = issues;
  }
}

const LITERAL = "literal" as const;
export class PawLiteralIssue extends PawIssueBase {
  public readonly kind = LITERAL;

  constructor(message: string, path?: PawIssuePath) {
    super(message, path);
  }
}

const UNION = "union" as const;
export class PawUnionIssue extends PawIssueBase {
  public readonly kind = UNION;

  constructor(message: string, path?: PawIssuePath) {
    super(message, path);
  }
}
