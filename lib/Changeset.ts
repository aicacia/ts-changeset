import { List, Map, Record } from "immutable";
import { COMPARISIONS } from "./comparisions";

type KeyOf<T> = keyof T;
type ValueOf<T> = T[keyof T];

export type IChanges<T extends {}> = Map<KeyOf<T>, ValueOf<T>>;

export interface IChangesetError {
  message: string;
  values: any[];
}

export const ChangesetError = Record<IChangesetError>({
  message: "",
  values: []
});

export type IChangesetErrors<T extends {}> = Map<
  KeyOf<T>,
  List<Record<IChangesetError>>
>;

export type IModified<T extends {}> = Map<KeyOf<T>, boolean>;

export interface IChangeset<T extends {}> {
  defaults: IChanges<T>;
  changes: IChanges<T>;
  errors: IChangesetErrors<T>;
  modified: IModified<T>;
  valid: boolean;
}

// TODO: Base class expressions cannot reference class type parameters ts(2562)
// fix this so we extend Record<IChangeset<T>>
export class Changeset<T extends {}> extends Record<IChangeset<any>>({
  defaults: Map(),
  changes: Map(),
  errors: Map(),
  modified: Map(),
  valid: true
}) {
  constructor(defaults: Partial<T> | Iterable<[KeyOf<T>, ValueOf<T>]>) {
    super({
      defaults: Map(defaults),
      changes: Map(defaults)
    });
  }

  isValid(): boolean {
    return this.valid;
  }

  isInvalid(): boolean {
    return !this.isValid();
  }

  hasChange<K extends KeyOf<T>>(field: K): boolean {
    return this.changes.has(field);
  }

  getChange<K extends KeyOf<T>>(
    field: K,
    defaultValue?: T[K]
  ): T[K] | undefined {
    return this.changes.get(field, defaultValue);
  }

  getModified<K extends KeyOf<T>>(field: K): boolean {
    return !!this.modified.get(field);
  }

  getError<K extends KeyOf<T>>(field: K): List<Record<IChangesetError>> {
    return this.errors.get(field) || List();
  }

  getErrors(): IChangesetErrors<T> {
    return this.errors as any;
  }

  getChanges(): IChanges<T> {
    return this.changes as any;
  }

  addError<K extends KeyOf<T>>(
    field: K,
    message: string,
    values: any[] = []
  ): this {
    return this.set(
      "errors",
      this.errors.update(field, errors =>
        (errors || List()).push(
          ChangesetError({
            message,
            values
          })
        )
      )
    ).set("valid", false);
  }

  addChange<K extends KeyOf<T>>(field: K, value: ValueOf<T>): this {
    return this.update("changes", changes => changes.set(field, value)).update(
      "modified",
      modified => modified.set(field, true)
    );
  }

  addChanges(changes: T): this {
    return Object.keys(changes).reduce(
      (acc, key) => acc.addChange(key as any, (changes as any)[key as any]),
      this
    );
  }

  addDefault<K extends KeyOf<T>>(field: K, value: ValueOf<T>): this {
    return this.update("defaults", defaults => defaults.set(field, value));
  }

  addDefaults(defaults: T): this {
    return Object.keys(defaults).reduce(
      (acc, key) => acc.addDefault(key as any, (defaults as any)[key as any]),
      this
    );
  }

  clearErrors(): this {
    return this.set("errors", Map()).set("valid", true);
  }

  clearChanges(): this {
    return this.set("changes", this.defaults).set("modified", Map());
  }

  clearDefaults(): this {
    return this.set("defaults", Map());
  }

  clear(): this {
    return this.clearErrors().clearChanges();
  }

  filter(fields: Array<KeyOf<T>>): this {
    return fields.reduce(
      (acc, field) =>
        acc
          .update("changes", changes =>
            changes.set(field, this.getChange(field))
          )
          .update("errors", errors => errors.set(field, this.getError(field)))
          .update("modified", modified => modified.set(field, true)),
      this.set("changes", Map())
        .set("errors", Map())
        .set("modified", Map())
    );
  }

  validate(validator: (changeset: this) => this): this {
    return validator(this);
  }

  validateAcceptance<K extends KeyOf<T>>(field: K): this {
    const value: boolean = !!this.getChange(field);

    if (value !== true) {
      return this.addError(field, "acceptance");
    } else {
      return this;
    }
  }

  validateLength<K extends KeyOf<T>>(
    field: K,
    opts: { [key: string]: number } = {}
  ): this {
    let value = this.getChange(field) as any;

    value = value == null ? [] : value;

    const length =
      value && typeof value.length === "number" ? +value.length : value;

    return Object.keys(opts).reduce((acc, op) => {
      const comparision = COMPARISIONS[op];

      if (comparision) {
        const opLength = +opts[op];

        if (!comparision(length, opLength)) {
          return acc.addError(field, "length", [op, opLength]);
        } else {
          return acc;
        }
      } else {
        throw new TypeError("No comparision for " + op);
      }
    }, this);
  }

  validateRequired(values: Array<KeyOf<T>>): this {
    return values.reduce((acc, field) => {
      const value: string | undefined = this.getChange(field) as any;

      if (value == null || value === "") {
        return acc.addError(field, "required");
      } else {
        return acc;
      }
    }, this);
  }

  validateFormat<K extends KeyOf<T>>(field: K, regex: RegExp): this {
    let value: string = this.getChange(field) as any;

    value = value == null ? "" : value.toString();

    if (!regex.test(value)) {
      return this.addError(field, "format", [regex]);
    } else {
      return this;
    }
  }
}

export interface Changeset<T extends {}>
  extends Record.Factory<IChangeset<T>> {}
