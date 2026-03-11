import { defineConfig } from 'prisma/config';

export default defineConfig({
    schema: "prisma-ezoko/schema.prisma",
    datasource: {
        url: process.env.EZOKO_DATABASE_URL
    }
});
