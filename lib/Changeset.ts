export interface IChanges {
    [key: string]: any;
}

export interface IError {
    message: string;
    keys: any[];
}

export interface IErrors {
    [key: string]: IError[];
}

export interface IModified {
    [key: string]: boolean;
}

export class Changeset {
    defaults: IChanges;
    changes: IChanges;
    errors: IErrors;
    modified: IModified;
    valid: boolean;

    constructor(defaults: IChanges) {
        this.defaults = defaults;
        this.changes = this.defaults;
        this.errors = {};
        this.modified = {};
        this.valid = true;
    }

    isValid() {
        return this.valid;
    }

    isInvalid() {
        return !this.isValid();
    }

    hasChange(field: string) {
        return !!this.changes[field];
    }

    getChange<T = any>(field: string, defaultValue?: T): T | undefined {
        if (this.changes.hasOwnProperty(field)) {
            return this.changes[field];
        } else {
            return defaultValue;
        }
    }

    getModified(field: string): boolean {
        return !!this.modified[field];
    }

    getError(field: string): IError[] {
        return this.errors[field] || [];
    }

    getErrors(): IErrors {
        return this.errors;
    }

    getChanges(): IChanges {
        return this.changes;
    }

    addError(field: string, message: string, keys: any[] = []): Changeset {
        const errors = this.errors[field] || (this.errors[field] = []);

        errors.push({
            message,
            keys
        });

        this.valid = false;

        return this;
    }

    addChange<T = any>(field: string, value: T): Changeset {
        this.changes[field] = value;
        this.modified[field] = true;
        return this;
    }

    addChanges(changes: IChanges): Changeset {
        Object.keys(changes).forEach(key => {
            this.addChange(key, changes[key]);
        });
        return this;
    }

    addDefault<T = any>(field: string, value: T): Changeset {
        this.defaults[field] = value;
        return this;
    }

    addDefaults(defaults: IChanges): Changeset {
        Object.keys(defaults).forEach(key => {
            this.addDefault(key, defaults[key]);
        });
        return this;
    }

    clearErrors(): Changeset {
        this.errors = {};
        this.valid = true;
        return this;
    }

    clearChanges(): Changeset {
        this.changes = this.defaults;
        this.modified = {};
        return this;
    }

    clearDefaults(): Changeset {
        this.defaults = {};
        return this;
    }

    clear(): Changeset {
        this.clearErrors();
        this.clearChanges();
        return this;
    }

    filter(fields: string[]): Changeset {
        const changes: IChanges = {},
            errors: IErrors = {},
            modified: IModified = {};

        fields.forEach(field => {
            changes[field] = this.getChange(field);
            errors[field] = this.getError(field);
            modified[field] = true;
        });

        this.changes = changes;
        this.errors = errors;
        this.modified = modified;

        return this;
    }

    validateAcceptance(field: string): Changeset {
        const value: boolean = !!this.getChange(field);

        if (value !== true) {
            this.addError(field, "acceptance");
        }

        return this;
    }

    validateLength(
        field: string,
        opts: { [key: string]: number } = {}
    ): Changeset {
        let value = this.getChange(field);

        value = value == null ? [] : value;

        const length =
            value && typeof value.length === "number" ? +value.length : value;

        Object.keys(opts).forEach((op: string) => {
            const comparision = COMPARISIONS[op];

            if (comparision) {
                const opLength = +opts[op];

                if (!comparision(length, opLength)) {
                    this.addError(field, "length", [op, opLength]);
                }
            } else {
                throw new TypeError("No comparision for " + op);
            }
        });

        return this;
    }

    validateRequired(values: string[]): Changeset {
        values.forEach((field: string) => {
            const value = this.getChange(field);

            if (value == null || value === "") {
                this.addError(field, "required");
            }
        });

        return this;
    }

    validateFormat(field: string, regex: RegExp): Changeset {
        let value = this.getChange(field);

        value = value == null ? "" : value.toString();

        if (!regex.test(value)) {
            this.addError(field, "format", [regex]);
        }

        return this;
    }
}

const eq = (a: number, b: number) => a === b;
const neq = (a: number, b: number) => a !== b;
const gte = (a: number, b: number) => a >= b;

const lte = (a: number, b: number) => a <= b;
const gt = (a: number, b: number) => a > b;

const lt = (a: number, b: number) => a < b;

const COMPARISIONS: { [key: string]: (a: number, b: number) => boolean } = {
    "==": eq,
    ">=": gte,
    "<=": lte,
    "!=": neq,
    ">": gt,
    "<": lt,
    eq: eq,
    gte: gte,
    lte: lte,
    neq: neq,
    gt: gt,
    lt: lt
};
