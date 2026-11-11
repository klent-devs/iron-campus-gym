import { z } from 'zod';

/**
 * Default wording for validation messages that have no custom text.
 * zod 4 reports a blank field as "Invalid input: expected string, received undefined";
 * staff should simply see "Required". A message set on a schema always wins over this.
 */
z.config({
  customError: (issue) => {
    if (issue.code === 'invalid_type' && (issue.input === undefined || issue.input === null)) {
      return 'Required';
    }
    return undefined; // keep zod's own wording for everything else
  },
});
