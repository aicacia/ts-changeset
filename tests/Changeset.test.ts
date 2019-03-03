import { Map } from "immutable";
import * as tape from "tape";
import { Changeset } from "../lib";

interface ITestForm {
  age: number;
  name: string;
  agreedToTerms: boolean;
}

const changesetFn = (changeset: Changeset<ITestForm>) =>
  changeset
    .filter(["age", "name", "agreedToTerms"])
    .validateAcceptance("agreedToTerms")
    .validateLength("age", { gt: 18 })
    .validateFormat("name", /[A-Za-z0-9\-_]+/)
    .validateRequired(["age", "name", "agreedToTerms"]);

tape("Changeset valid", (assert: tape.Test) => {
  let changeset = new Changeset({
    age: 0,
    name: "",
    agreedToTerms: false
  });

  changeset = changesetFn(
    changeset.addChanges({
      age: 20,
      name: "Nathan",
      agreedToTerms: true
    })
  );

  assert.equals(changeset.isValid(), true);

  assert.deepEquals(changeset.getChanges().toJS(), {
    age: 20,
    name: "Nathan",
    agreedToTerms: true
  });
  assert.true(
    changeset.get("changes").equals(
      Map({
        age: 20,
        name: "Nathan",
        agreedToTerms: true
      })
    )
  );

  assert.end();
});

tape("Changeset invalid", (assert: tape.Test) => {
  let changeset = new Changeset({
    age: 0,
    name: "",
    agreedToTerms: false
  });

  changeset = changesetFn(
    changeset.addChanges({
      age: 15,
      name: "%#%$%@",
      agreedToTerms: false
    })
  );

  assert.equals(changeset.isValid(), false);
  assert.deepEquals(changeset.getChanges().toJS(), {
    age: 15,
    name: "%#%$%@",
    agreedToTerms: false
  });
  assert.deepEquals(changeset.getErrors().toJS(), {
    age: [{ message: "length", values: ["gt", 18] }],
    name: [{ message: "format", values: [/[A-Za-z0-9\-_]+/] }],
    agreedToTerms: [{ message: "acceptance", values: [] }]
  });

  assert.end();
});
