-- Add category support for user-defined resume grouping in dashboard
ALTER TABLE "Resume"
ADD COLUMN "category" TEXT;
