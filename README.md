# ts-changeset

[![license](https://img.shields.io/badge/license-MIT%2FApache--2.0-blue")](LICENSE-MIT)
[![docs](https://img.shields.io/badge/docs-typescript-blue.svg)](https://aicacia.github.io/ts-changeset/)
[![npm (scoped)](https://img.shields.io/npm/v/@aicacia/changeset)](https://www.npmjs.com/package/@aicacia/changeset)
[![build](https://github.com/aicacia/ts-changeset/workflows/Test/badge.svg)](https://github.com/aicacia/ts-changeset/actions?query=workflow%3ATest)

ecto like changesets for typescript

```typescript
const changesetFn = (changeset: Changeset) =>
  changeset
    .validateAcceptance("agreedToTerms")
    .validateLength("age", { gt: 18 })
    .validateFormat("name", /[A-Za-z0-9\-_]+/)
    .validateRequired(["age", "name", "agreedToTerms"]);

let changeset = new Changeset({
  age: 0,
  name: "",
  agreedToTerms: false,
});

let changeset = changesetFn(changeset);

console.log(changeset.getErrors());
console.log(changeset.isValid());
```
