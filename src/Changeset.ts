import { List, Map, Record as ImmutableRecord } from "immutable";
import { COMPARISIONS } from "./comparisions";

type KeyOf<T> = keyof T;
type ValueOf<T> = T[keyof T];

export type IChanges<T extends Record<string, any>> = Map<KeyOf<T>, ValueOf<T>>;

export interface IChangesetError<M = any> {
  message: string;
  values: any[];
  meta?: M;
}

export const ChangesetError = ImmutableRecord<IChangesetError>({
  message: "",
  values: [],
  meta: undefined,
});

export type IChangesetErrors<T extends Record<string, any>> = Map<
  KeyOf<T>,
  List<ImmutableRecord<IChangesetError>>
>;

export type IModified<T extends Record<string, any>> = Map<KeyOf<T>, boolean>;

export interface IChangeset<T extends Record<string, any>> {
  defaults: IChanges<T>;
  changes: IChanges<T>;
  errors: IChangesetErrors<T>;
  modified: IModified<T>;
  valid: boolean;
}

// TODO: Base class expressions cannot reference class type parameters ts(2562)
// fix this so we extend ImmutableRecord<IChangeset<T>>
export class Changeset<T extends Record<string, any>> extends ImmutableRecord<
  IChangeset<any>
>({
  defaults: Map(),
  changes: Map(),
  errors: Map(),
  modified: Map(),
  valid: true,
}) {
  static validateAcceptance<T extends Record<string, any>, K extends KeyOf<T>>(
    changeset: Changeset<T>,
    field: K
  ): Changeset<T> {
    const value = !!changeset.getField(field);

    if (value !== true) {
      return changeset.addError(field, "acceptance");
    } else {
      return changeset;
    }
  }

  static validateLength<T extends Record<string, any>, K extends KeyOf<T>>(
    changeset: Changeset<T>,
    field: K,
    opts: { [key: string]: number } = {}
  ): Changeset<T> {
    let value = changeset.getField(field) as any;

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
    }, changeset);
  }

  static validateRequired<T extends Record<string, any>>(
    changeset: Changeset<T>,
    values: Array<KeyOf<T>>
  ): Changeset<T> {
    return values.reduce((acc, field) => {
      const value: string | undefined = changeset.getField(field) as any;

      if (value == null || value === "") {
        return acc.addError(field, "required");
      } else {
        return acc;
      }
    }, changeset);
  }
  static validateFormat<T extends Record<string, any>, K extends KeyOf<T>>(
    changeset: Changeset<T>,
    field: K,
    regex: RegExp
  ): Changeset<T> {
    let value: string = changeset.getField(field) as any;

    value = value == null ? "" : value.toString();

    if (!regex.test(value)) {
      return changeset.addError(field, "format", [regex]);
    } else {
      return changeset;
    }
  }
  constructor(defaults: Partial<T> | Iterable<[KeyOf<T>, ValueOf<T>]>) {
    super({
      defaults: Map(defaults as any),
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

  getDefault<K extends KeyOf<T>>(
    field: K,
    defaultValue?: T[K]
  ): T[K] | undefined {
    return this.defaults.get(field, defaultValue);
  }

  getChange<K extends KeyOf<T>>(
    field: K,
    defaultValue?: T[K]
  ): T[K] | undefined {
    return this.changes.get(field, defaultValue);
  }

  getField<K extends KeyOf<T>>(
    field: K,
    defaultValue?: T[K]
  ): T[K] | undefined {
    return this.getChange(field, this.getDefault(field, defaultValue));
  }

  getModified<K extends KeyOf<T>>(field: K): boolean {
    return !!this.modified.get(field);
  }

  getErrorList<K extends KeyOf<T>>(
    field: K
  ): List<ImmutableRecord<IChangesetError>> {
    return this.errors.get(field) || List();
  }

  getErrors(): IChangesetErrors<T> {
    return this.errors as any;
  }

  getDefaults(): IChanges<T> {
    return this.defaults as any;
  }

  getChanges(): IChanges<T> {
    return this.changes as any;
  }

  applyChanges(): IChanges<T> {
    return this.getDefaults().merge(this.getChanges()) as any;
  }

  addError<K extends KeyOf<T>, M = any>(
    field: K,
    message: string,
    values: any[] = [],
    meta?: M
  ): this {
    return this.set(
      "errors",
      this.errors.update(field, (errors) =>
        (errors || List()).push(
          ChangesetError({
            message,
            values,
            meta,
          })
        )
      )
    ).set("valid", false);
  }

  addChange<K extends KeyOf<T>>(field: K, value: ValueOf<T>): this {
    return this.update("changes", (changes) =>
      changes.set(field, value)
    ).update("modified", (modified) => modified.set(field, true));
  }

  addChanges(changes: Partial<T>): this {
    return Object.keys(changes).reduce(
      (acc, key) => acc.addChange(key as any, (changes as any)[key as any]),
      this
    );
  }

  addDefault<K extends KeyOf<T>>(field: K, value: ValueOf<T>): this {
    return this.update("defaults", (defaults) => defaults.set(field, value));
  }

  addDefaults(defaults: Partial<T>): this {
    return Object.keys(defaults).reduce(
      (acc, key) => acc.addDefault(key as any, (defaults as any)[key as any]),
      this
    );
  }

  clearErrors(): this {
    return this.set("errors", Map()).set("valid", true);
  }

  clearChanges(): this {
    return this.set("changes", Map()).set("modified", Map());
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
          .update("changes", (changes) =>
            this.hasChange(field)
              ? changes.set(field, this.getChange(field))
              : changes
          )
          .update("errors", (errors) =>
            errors.set(field, this.getErrorList(field))
          )
          .update("modified", (modified) => modified.set(field, true)),
      this.set("changes", Map()).set("errors", Map()).set("modified", Map())
    );
  }

  validate(validator: (changeset: this) => this): this {
    return validator(this);
  }
  validateAcceptance<K extends KeyOf<T>>(field: K): this {
    return this.validate(
      (changeset) => Changeset.validateAcceptance(changeset, field) as this
    );
  }
  validateLength<K extends KeyOf<T>>(
    field: K,
    opts: { [key: string]: number } = {}
  ): this {
    return this.validate(
      (changeset) => Changeset.validateLength(changeset, field, opts) as this
    );
  }
  validateRequired(values: Array<KeyOf<T>>): this {
    return this.validate(
      (changeset) => Changeset.validateRequired(changeset, values) as this
    );
  }
  validateFormat<K extends KeyOf<T>>(field: K, regex: RegExp): this {
    return this.validate(
      (changeset) => Changeset.validateFormat(changeset, field, regex) as any
    );
  }
}

export interface Changeset<T extends Record<string, any>>
  extends ImmutableRecord.Factory<IChangeset<T>> {}
