import * as tape from "tape";
import { Changeset } from "../lib";

const changesetFn = (changeset: Changeset) =>
    changeset
        .filter(["age", "name", "agreedToTerms"])
        .validateAcceptance("agreedToTerms")
        .validateLength("age", { gt: 18 })
        .validateFormat("name", /[A-Za-z0-9\-_]+/)
        .validateRequired(["age", "name", "agreedToTerms"]);

tape("Changeset valid", (assert: tape.Test) => {
    const changeset = new Changeset({
        age: 0,
        name: "",
        agreedToTerms: false
    });

    changeset.addChanges({
        age: 20,
        name: "Nathan",
        agreedToTerms: true
    });
    changesetFn(changeset);

    assert.equals(changeset.isValid(), true);
    assert.deepEquals(changeset.getChanges(), {
        age: 20,
        name: "Nathan",
        agreedToTerms: true
    });

    assert.end();
});

tape("Changeset invalid", (assert: tape.Test) => {
    const changeset = new Changeset({
        age: 0,
        name: "",
        agreedToTerms: false
    });

    changeset.addChanges({
        age: 15,
        name: "%#%$%@",
        agreedToTerms: false
    });
    changesetFn(changeset);

    assert.equals(changeset.isValid(), false);
    assert.deepEquals(changeset.getChanges(), {
        age: 15,
        name: "%#%$%@",
        agreedToTerms: false
    });
    assert.deepEquals(changeset.getErrors(), {
        age: [{ message: "length", keys: ["gt", 18] }],
        name: [{ message: "format", keys: [/[A-Za-z0-9\-_]+/] }],
        agreedToTerms: [{ message: "acceptance", keys: [] }]
    });

    assert.end();
});
