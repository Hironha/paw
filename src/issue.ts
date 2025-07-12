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

const REQUIRED = "req" as const;
export class PawRequiredIssue implements PawIssueBase {
  public readonly kind = REQUIRED;
  public message: string;

  constructor(message: string) {
    this.message = message;
  }
}

const STR = "str" as const;
export class PawStringIssue implements PawIssueBase {
  public readonly kind = STR;
  public message: string;

  constructor(message: string) {
    this.message = message;
  }
}

const NUM = "num" as const;
export class PawNumberIssue implements PawIssueBase {
  public readonly kind = NUM;
  public message: string;

  constructor(message: string) {
    this.message = message;
  }
}

const BOOL = "bool" as const;
export class PawBooleanIssue implements PawIssueBase {
  public readonly kind = BOOL;
  public message: string;

  constructor(message: string) {
    this.message = message;
  }
}

const ARR = "arr-type" as const;
export class PawArrayTypeIssue implements PawIssueBase {
  public readonly kind = ARR;
  public message: string;

  constructor(message: string) {
    this.message = message;
  }
}

export type PawArrayIndexIssue = {
  idx: number;
  issue: PawIssue;
};

const ARR_SCHEMA = "arr-schema";
export class PawArraySchemaIssue implements PawIssueBase {
  public readonly kind = ARR_SCHEMA;
  public readonly message: string;
  public readonly issues: PawArrayIndexIssue[];

  constructor(message: string, issues: PawArrayIndexIssue[]) {
    this.message = message;
    this.issues = issues;
  }
}

const OBJ_TYPE = "obj-type";
export class PawObjectTypeIssue implements PawIssueBase {
  public readonly kind = OBJ_TYPE;
  public readonly message: string;

  constructor(message: string) {
    this.message = message;
  }
}

export type PawObjectFieldIssue = {
  field: string;
  issue: PawIssue;
};

const OBJ_SCHEMA = "obj-schema" as const;
export class PawObjectSchemaIssue implements PawIssueBase {
  public readonly kind = OBJ_SCHEMA;
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
