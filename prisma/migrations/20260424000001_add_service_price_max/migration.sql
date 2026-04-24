-- AlterTable: add optional priceMax to services
ALTER TABLE [dbo].[services] ADD [priceMax] DECIMAL(10,2) NULL;
