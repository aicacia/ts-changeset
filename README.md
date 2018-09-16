# ts-changeset

ecto like changesets for typescript

```typescript
const changesetFn = (changeset: Changeset) =>
    changeset
        .validateAcceptance("agreedToTerms")
        .validateLength("age", { gt: 18 })
        .validateFormat("name", /[A-Za-z0-9\-_]+/)
        .validateRequired(["age", "name", "agreedToTerms"]);

const changeset = new Changeset({
    age: 0,
    name: "",
    agreedToTerms: false
});

changesetFn(changeset);

console.log(changeset.getErrors());
console.log(changeset.isValid());
```
