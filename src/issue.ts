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

interface PawIssueBase {
  readonly message: string;
}

const REQUIRED = "required" as const;
export class PawRequiredIssue implements PawIssueBase {
  public readonly kind = REQUIRED;
  public message: string;

  constructor(message: string) {
    this.message = message;
  }
}

const STRING = "string" as const;
export class PawStringIssue implements PawIssueBase {
  public readonly kind = STRING;
  public message: string;

  constructor(message: string) {
    this.message = message;
  }
}

const NUMBER = "number" as const;
export class PawNumberIssue implements PawIssueBase {
  public readonly kind = NUMBER;
  public message: string;

  constructor(message: string) {
    this.message = message;
  }
}

const BOOLEAN = "boolean" as const;
export class PawBooleanIssue implements PawIssueBase {
  public readonly kind = BOOLEAN;
  public message: string;

  constructor(message: string) {
    this.message = message;
  }
}

const ARRAY = "array-type" as const;
export class PawArrayTypeIssue implements PawIssueBase {
  public readonly kind = ARRAY;
  public message: string;

  constructor(message: string) {
    this.message = message;
  }
}

export type PawArrayIndexIssue = {
  idx: number;
  issue: PawIssue;
};

const ARRAY_SCHEMA = "array-schema";
export class PawArraySchemaIssue implements PawIssueBase {
  public readonly kind = ARRAY_SCHEMA;
  public readonly message: string;
  public readonly issues: PawArrayIndexIssue[];

  constructor(message: string, issues: PawArrayIndexIssue[]) {
    this.message = message;
    this.issues = issues;
  }
}

const OBJECT_TYPE = "object-type";
export class PawObjectTypeIssue implements PawIssueBase {
  public readonly kind = OBJECT_TYPE;
  public readonly message: string;

  constructor(message: string) {
    this.message = message;
  }
}

export type PawObjectFieldIssue = {
  field: string;
  issue: PawIssue;
};

const OBJECT_SCHEMA = "object-schema" as const;
export class PawObjectSchemaIssue implements PawIssueBase {
  public readonly kind = OBJECT_SCHEMA;
  public readonly message: string;
  public readonly issues: PawObjectFieldIssue[];

  constructor(message: string, issues: PawObjectFieldIssue[]) {
    this.message = message;
    this.issues = issues;
  }
}

const LITERAL = "literal" as const;
export class PawLiteralIssue implements PawIssueBase {
  public readonly kind = LITERAL;
  public message: string;

  constructor(message: string) {
    this.message = message;
  }
}

const UNION = "union" as const;
export class PawUnionIssue implements PawIssueBase {
  public readonly kind = UNION;
  public message: string;

  constructor(message: string) {
    this.message = message;
  }
}
