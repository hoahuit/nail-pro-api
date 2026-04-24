-- AlterTable: add optional priceMax to services (if not exists)
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'services' AND COLUMN_NAME = 'priceMax'
)
BEGIN
  ALTER TABLE [dbo].[services] ADD [priceMax] DECIMAL(10,2) NULL;
END;
