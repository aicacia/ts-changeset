import { List, Map, Record as ImmutableRecord } from "immutable";
import { COMPARISIONS } from "./comparisions";

type KeyOf<T extends Record<string, any>> = keyof T;
type ValueOf<T extends Record<string, any>> = T[KeyOf<T>];

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

export type IChangesetErrors<T extends Record<string, any>, M = any> = Map<
  KeyOf<T>,
  List<ImmutableRecord<IChangesetError<M>>>
>;

export type IModified<T extends Record<string, any>> = Map<KeyOf<T>, boolean>;

export interface IChangeset<T extends Record<string, any>> {
  defaults: IChanges<T>;
  changes: IChanges<T>;
  errors: IChangesetErrors<T>;
  modified: IModified<T>;
  valid: boolean;
}

export class Changeset<
  T extends Record<string, any>,
  M = any
> extends ImmutableRecord<IChangeset<any>>({
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
      const value = changeset.getField(field);

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
    const value: string = changeset.getField(field) as any;

    if (!regex.test(value == null ? "" : value.toString())) {
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
  ): List<ImmutableRecord<IChangesetError<M>>> {
    return this.errors.get(field) || List();
  }

  getErrors(): IChangesetErrors<T, M> {
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

  addError<K extends KeyOf<T>>(
    field: K,
    message: string,
    values: any[] = [],
    meta?: M
  ) {
    return this.update("errors", (errors) =>
      errors.update(field, (errorList) =>
        (errorList || List()).push(
          ChangesetError({
            message,
            values,
            meta,
          })
        )
      )
    ).set("valid", false);
  }

  addChange<K extends KeyOf<T>>(field: K, value?: ValueOf<T>) {
    return this.update("changes", (changes) =>
      changes.set(field, value)
    ).update("modified", (modified) => modified.set(field, true));
  }

  addChanges(newChanges: Partial<T>) {
    return (Object.keys(newChanges) as KeyOf<T>[]).reduce(
      (acc, key) => acc.addChange(key, newChanges[key]),
      this
    );
  }

  addDefault<K extends KeyOf<T>>(field: K, value?: ValueOf<T>) {
    return this.update("defaults", (defaults) => defaults.set(field, value));
  }

  addDefaults(defaults: Partial<T>) {
    return (Object.keys(defaults) as KeyOf<T>[]).reduce(
      (acc, key) => acc.addDefault(key, defaults[key]),
      this
    );
  }

  clearErrors() {
    return this.set("errors", Map()).set("valid", true);
  }

  clearChanges() {
    return this.set("changes", Map()).set("modified", Map());
  }

  clearDefaults() {
    return this.set("defaults", Map());
  }

  clear() {
    return this.clearErrors().clearChanges();
  }

  filter(fields: Array<KeyOf<T>>) {
    return fields.reduce(
      (changeset, field) =>
        changeset
          .update("changes", (changes) =>
            this.hasChange(field)
              ? changes.set(field, this.getChange(field))
              : changes
          )
          .update("errors", (errors) =>
            errors.set(field, this.getErrorList(field))
          )
          .update("modified", (modified) => modified.set(field, true)),
      this.clear()
    );
  }

  validate(validator: (changeset: Changeset<T>) => Changeset<T>) {
    return validator(this);
  }
  validateAcceptance<K extends KeyOf<T>>(field: K) {
    return this.validate((changeset) =>
      Changeset.validateAcceptance<T, K>(changeset, field)
    );
  }
  validateLength<K extends KeyOf<T>>(
    field: K,
    opts: { [key: string]: number } = {}
  ) {
    return this.validate((changeset) =>
      Changeset.validateLength(changeset, field, opts)
    );
  }
  validateRequired(values: Array<KeyOf<T>>) {
    return this.validate((changeset) =>
      Changeset.validateRequired(changeset, values)
    );
  }
  validateFormat<K extends KeyOf<T>>(field: K, regex: RegExp) {
    return this.validate((changeset) =>
      Changeset.validateFormat(changeset, field, regex)
    );
  }
}

export interface Changeset<T extends Record<string, any>>
  extends ImmutableRecord.Factory<IChangeset<T>> {}
