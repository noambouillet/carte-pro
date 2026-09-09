# Elysia with Bun runtime

## Development
To start the development server run:
```bash
bun run dev
```

Open https://localhost:3000/ with your browser to see the result.

## Drizzle schema

The drizzle schema is located in `db/drizzle`. It's made using the command `bunx drizzle-kit pull`.

In the schema.ts, youll need to replace `unknown("email").notNull()` by `citext("email").notNull()` and add:

```ts
    import { customType } from "drizzle-orm/pg-core";

    const citext = customType<{
    data: string;
    driverData: string;
    }>({
    dataType() {
        return "citext";
    },
    });
```

Regenerate the schema when you update the original SQL schema.
