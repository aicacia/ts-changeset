import * as tape from "tape";
import { Changeset } from ".";

interface ITestForm {
  age: number;
  name: string;
  agreedToTerms: boolean;
}

const changesetFn = (changeset: Changeset<ITestForm>) =>
  changeset
    .filter(["age", "name", "agreedToTerms"])
    .validateAcceptance("agreedToTerms")
    .validateLength("age", {
      gte: 18,
      gt: 17,
      neq: 0,
      lt: 100,
      lte: 99,
      eq: 18,
    })
    .validateFormat("name", /[A-Za-z0-9\-_]+/)
    .validateRequired(["age", "name", "agreedToTerms"]);

tape("Changeset valid", (assert: tape.Test) => {
  let changeset = new Changeset<ITestForm>({
    age: 18,
  });

  changeset = changesetFn(
    changeset.addChanges({
      name: "Bob",
      agreedToTerms: true,
    })
  );

  assert.true(changeset.isValid());

  assert.deepEquals(changeset.applyChanges().toJS(), {
    age: 18,
    name: "Bob",
    agreedToTerms: true,
  });
  assert.deepEquals(changeset.get("changes").toJS(), {
    name: "Bob",
    agreedToTerms: true,
  });

  changeset = changeset.clear();

  assert.deepEquals(changeset.applyChanges().toJS(), {
    age: 18,
  });

  assert.end();
});

tape("Changeset invalid", (assert: tape.Test) => {
  let changeset = new Changeset<ITestForm>({
    age: 18,
  });

  changeset = changesetFn(
    changeset.addChanges({
      age: 15,
      name: "%#%$%@",
    })
  );

  assert.true(changeset.isInvalid());
  assert.deepEquals(changeset.getChanges().toJS(), {
    age: 15,
    name: "%#%$%@",
  });
  assert.deepEquals(changeset.getErrors().toJS(), {
    age: [
      { message: "length", values: ["gte", 18], meta: undefined },
      { message: "length", values: ["gt", 17], meta: undefined },
      { message: "length", values: ["eq", 18], meta: undefined },
    ],
    name: [{ message: "format", values: [/[A-Za-z0-9\-_]+/], meta: undefined }],
    agreedToTerms: [
      { message: "acceptance", values: [], meta: undefined },
      { message: "required", values: [], meta: undefined },
    ],
  });

  assert.end();
});
