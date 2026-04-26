declare module "mailparser" {
  interface AddressGroup {
    text?: string;
    value?: Array<{ name?: string; address?: string }>;
  }

  interface ParsedMail {
    subject?: string | null;
    text?: string | null;
    html?: string | null;
    from?: AddressGroup;
    to?: AddressGroup;
    date?: Date;
  }

  export function simpleParser(
    source: Buffer | string
  ): Promise<ParsedMail>;
}
