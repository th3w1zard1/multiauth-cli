export interface AccountEntry {
  name: string;
  apiKey: string;
  /** User-only label, not sent to any API */
  email?: string;
}

export interface AccountsFile {
  version: 1;
  defaultAccount?: string;
  accounts: AccountEntry[];
}
