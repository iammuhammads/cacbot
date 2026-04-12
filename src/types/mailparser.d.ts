declare module "mailparser" {
  export function simpleParser(
    source: Buffer | string
  ): Promise<{ subject?: string | null; text?: string | null }>;
}

